const { StatusCodes } = require("http-status-codes");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

const create = (req, res) => {
  if (!req.body) req.body = {};
  const { error, value } = taskSchema.validate(req.body);
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
  const newTask = {
    ...value,
    id: taskCounter(),
    userId: global.user_id.email,
  };
  global.tasks.push(newTask);
  const { userId, ...sanitizedTask } = newTask;
  return res.status(201).json(sanitizedTask);
};

const index = (req, res) => {
  const userTasks = global.tasks.filter(
    (task) => task.userId === global.user_id.email,
  );
  const sanitizedTasks = userTasks.map((task) => {
    const { userId, ...sanitizedTask } = task;
    return sanitizedTask;
  });

  if (sanitizedTasks.length === 0) {
    return res.status(404).json({ message: "No tasks found." });
  }

  return res.status(200).json(sanitizedTasks);
};

const show = (req, res) => {
  const taskToFind = parseInt(req.params?.id);
  if (!taskToFind) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }

  const task = global.tasks.find(
    (task) => task.id === taskToFind && task.userId === global.user_id.email,
  );

  if (!task) {
    return res.status(404).json({ message: "Task was not found." });
  }

  const { userId, ...sanitizedTask } = task;
  return res.status(200).json(sanitizedTask);
};

const update = (req, res) => {
  const taskToFind = parseInt(req.params?.id);
  if (!taskToFind) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }

  const currentTask = global.tasks.find(
    (task) => task.id === taskToFind && task.userId === global.user_id.email,
  );

  if (!currentTask) {
    return res.status(404).json({ message: "Task was not found." });
  }

  if (!req.body) req.body = {};
  const { error, value } = patchTaskSchema.validate(req.body);
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  Object.assign(currentTask, value);
  const { userId, ...sanitizedTask } = currentTask;
  return res.status(200).json(sanitizedTask);
};

const deleteTask = (req, res) => {
  const taskToFind = parseInt(req.params?.id);
  if (!taskToFind) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }

  const taskIndex = global.tasks.findIndex(
    (task) => task.id === taskToFind && task.userId === global.user_id.email,
  );

  if (taskIndex === -1) {
    return res.status(404).json({ message: "Task not found." });
  }

  const { userId, ...task } = global.tasks[taskIndex];
  global.tasks.splice(taskIndex, 1);
  return res.status(200).json(task);
};

module.exports = { create, index, show, update, deleteTask };
