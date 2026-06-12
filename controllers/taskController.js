const { StatusCodes } = require("http-status-codes");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const pool = require("../db/pg-pool");
const prisma = require("../db/prisma");

const create = async (req, res) => {
  if (!req.body) req.body = {};
  const { error, value } = taskSchema.validate(req.body);
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  const task = await prisma.task.create({
    data: {
      title: value.title,
      isCompleted: value.isCompleted,
      priority: value.priority,
      userId: req.user.id,
    },
    select: { id: true, title: true, isCompleted: true, priority: true },
  });

  return res.status(201).json(task);
};

const index = async (req, res) => {
  // Parse pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const whereClause = { userId: req.user.id };
  const validPriorities = ["low", "medium", "high"];
  const { min_date } = req.query;
  const { max_date } = req.query;

  if (req.query.find) {
    whereClause.title = {
      contains: req.query.find,
      mode: "insensitive",
    };
  }

  if (req.query.isCompleted !== undefined) {
    whereClause.isCompleted = req.query.isCompleted === "true";
  }

  if (req.query.priority && validPriorities.includes(req.query.priority)) {
    whereClause.priority = req.query.priority;
  }

  if (min_date || max_date) {
    whereClause.createdAt = {};
    if (min_date) {
      whereClause.createdAt.gte = new Date(min_date);
    }
    if (max_date) {
      whereClause.createdAt.lte = new Date(max_date);
    }
  }

  const getOrderBy = (query) => {
    const validSortFields = [
      "title",
      "priority",
      "createdAt",
      "id",
      "isCompleted",
    ];
    const sortBy = query.sortBy || "createdAt";
    const sortDirection = query.sortDirection === "asc" ? "asc" : "desc";

    if (validSortFields.includes(sortBy)) {
      return { [sortBy]: sortDirection };
    }
    return { createdAt: "desc" }; // default fallback
  };

  //Get tasks with pagination and eager loading
  const tasks = await prisma.task.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    skip,
    take: limit,
    orderBy: getOrderBy(req.query),
  });

  // Get total count for pagination metadata
  const totalTasks = await prisma.task.count({
    where: whereClause,
  });

  if (tasks.length === 0) {
    return res.status(404).json({ message: "No tasks found." });
  }

  // Build pagination object with complete metadata
  // Hint: The test expects page, limit, total, pages, hasNext, hasPrev
  // Use Math.ceil() to calculate pages, and compare page * limit with total for hasNext
  const pages = Math.ceil(totalTasks / limit);

  const pagination = {
    page,
    limit,
    total: totalTasks,
    pages,
    hasNext: page * limit < totalTasks,
    hasPrev: page > 1,
  };

  //Return tasks with pagination information
  return res.status(200).json({ tasks, pagination }); //return pagination too.
};

const show = async (req, res, next) => {
  const taskId = parseInt(req.params?.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ error: "Invalid task ID" });
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId: req.user.id },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        User: { select: { name: true, email: true } },
      },
    });
    if (!task) return res.status(404).json({ message: "Task not found." });
    return res.status(200).json(task);
  } catch (err) {
    return next(err);
  }
};

const update = async (req, res, next) => {
  const taskToFind = parseInt(req.params?.id);
  if (!taskToFind) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }

  if (!req.body) req.body = {};
  const { error, value } = patchTaskSchema.validate(req.body);
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  try {
    const task = await prisma.task.update({
      data: value,
      where: {
        id: taskToFind,
        userId: req.user.id,
      },
      select: { title: true, isCompleted: true, id: true, priority: true },
    });
    return res.status(200).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    } else {
      return next(err); // pass other errors to the global error handler
    }
  }
};

const deleteTask = async (req, res, next) => {
  const taskToFind = parseInt(req.params?.id);
  if (!taskToFind) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }

  try {
    const deletedTask = await prisma.task.delete({
      where: { id: taskToFind, userId: req.user.id },
      select: { title: true, id: true, isCompleted: true },
    });
    return res.status(200).json(deletedTask);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    }
    return next(err);
  }
};

const bulkCreate = async (req, res, next) => {
  const { tasks } = req.body;

  // Validate the tasks array
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }

  // Validate all tasks before insertion
  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details,
      });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || "medium",
      userId: req.user.id,
    });
  }

  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    res.status(201).json({
      message: "Bulk task creation successful",
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { create, index, show, update, deleteTask, bulkCreate };
