import ApiError from '../error/apiError.js';
import TaskModel from '../models/Task.js';

export const getTasks = async (req, res) => {

    const tasksOnPage = req.query.limit > 0 ? req.query.limit : 0;
    const pageNumber = req.query.page > 0 ? req.query.page : 1;

    let taskFilter = { author: req.userId };
    if (req.query.tabKey === '1') taskFilter = { ...taskFilter, completed: false };
    if (req.query.tabKey === '2') taskFilter = { ...taskFilter, completed: true };
    if (req.query.search) taskFilter =
        { ...taskFilter, title: { $regex: req.query.search, $options: 'i' } };

    let sortKey = { createdAt: 1 };
    switch (req.query.sortField) {
        case 'createdAt': sortKey = { createdAt: req.query.sortOrder }
            break;
        case 'deadline': sortKey = { deadline: req.query.sortOrder }
            break;
        case 'title': sortKey = { title: req.query.sortOrder }
            break;
        default: sortKey = { createdAt: 1 }
    };

    const totalTasksQty = (await TaskModel.find(taskFilter)).length;
    const totalPagesQty = Math.ceil(totalTasksQty / tasksOnPage);

    const tasks = await TaskModel.find(taskFilter, {
        title: true,
        subtitle: true,
        description: true,
        completed: true,
        createdAt: true,
        deadline: true
    }).sort(sortKey).limit(tasksOnPage).skip((pageNumber - 1) * tasksOnPage);

    const tasksOnPageQty = tasks.length;

    res.json({
        totalTasksQty, totalPagesQty, tasksOnPageQty, tasks
    });
};

export const createTask = async (req, res, next) => {
    const { title, subtitle, description, completed, deadline } = req.body;
    const doc = new TaskModel({
        title,
        subtitle,
        description,
        completed,
        deadline,
        author: req.userId
    });
    const task = await doc.save();
    const { _id, createdAt } = task;

    res.status(201).send({
        _id, title, subtitle, description, completed, createdAt, deadline,
        message: 'Task successfully created'
    });
};

export const updateTask = async (req, res, next) => {
    const { title, subtitle, description, _id, completed, deadline } = req.body;
    const status = await TaskModel.updateOne(
        { _id, author: req.userId },
        {
            $set: {
                title,
                subtitle,
                description,
                completed,
                deadline
            }
        });
    if (!status.modifiedCount) {
        return next(ApiError.forbidden("Modified forbidden"))
    }

    res.json({
        status,
        message: 'Task successfully updated'
    });
};

export const deleteTask = async (req, res, next) => {
    const { _id } = req.body;
    const status = await TaskModel.deleteOne({ _id, author: req.userId });
    if (!status.deletedCount) {
        return next(ApiError.forbidden("Deleted forbidden"))
    }

    res.json({
        status,
        message: 'Task successfully deleted'
    });
};