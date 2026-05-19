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
      userId: global.user_id,
    },
    select: { id: true, title: true, isCompleted: true },
  });

  return res.status(201).json(task);
};

const index = async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { userId: global.user_id },
    select: { title: true, isCompleted: true, id: true },
  });

  if (tasks.length === 0) {
    return res.status(404).json({ message: "No tasks found." });
  }

  return res.status(200).json(tasks);
};

const show = async (req, res, next) => {
  const taskToFind = parseInt(req.params?.id);
  if (!taskToFind) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }

  try {
    const showedTask = await prisma.task.findUnique({
      where: { id: taskToFind, userId: global.user_id },
      select: { id: true, title: true, isCompleted: true },
    });
    if (!showedTask) {
      return res.status(404).json({ message: "Task was not found." });
    }
    return res.status(200).json(showedTask);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found" });
    } else {
      return next(err);
    }
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
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true },
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

  // const deletedTask = await pool.query(
  //   "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id, title, is_completed",
  //   [taskToFind, global.user_id],
  // );

  // if (deletedTask.rows.length === 0) {
  //   return res.status(404).json({ message: "Task not found." });
  // }

  // return res.status(200).json(deletedTask.rows[0]);

  try {
    const deletedTask = await prisma.task.delete({
      where: { id: taskToFind, userId: global.user_id },
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

module.exports = { create, index, show, update, deleteTask };
