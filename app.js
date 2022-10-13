const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
const format = require("date-fns/format");
app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3002, () => {
      console.log("server running...");
    });
  } catch (error) {
    console.log(`DB error: ${error.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const validTodos = async (request, response, next) => {
  let invalidTodo = "";
  const { search_q, priority, status, category, date } = request.query;
  let dateFormat;
  if (priority !== undefined) {
    invalidTodo = "Todo Priority";
  } else if (status !== undefined) {
    invalidTodo = "Todo Status";
  } else if (category !== undefined) {
    invalidTodo = "Todo Category";
  } else if (date !== undefined) {
    invalidTodo = "Due Date";
    dateFormat = format(new Date(date), "yyyy-MM-dd");
  }
  const isValidQuery = `
  SELECT *
  FROM todo
  WHERE (priority LIKE '${priority}') OR
         (status LIKE '${status}') OR
         (category LIKE '${category}') OR 
         (due_date LIKE '${dateFormat}') OR
         todo LIKE '%${search_q}%';`;
  const isValidDb = await db.get(isValidQuery);
  if (isValidDb === undefined) {
    response.status(400);
    response.send(`Invalid ${invalidTodo}`);
  } else {
    next();
  }
};

//get todo
app.get("/todos/", validTodos, async (request, response) => {
  let { search_q, priority, status, category, date } = request.query;
  let formatDate;
  if (date !== undefined) {
    formatDate = format(new Date(date), "yyyy-MM-dd");
  }
  let getQuery = "";
  switch (true) {
    case category !== undefined && status !== undefined:
      getQuery = `
        SELECT id,todo,priority,status,category,due_date As dueDate
        FROM todo
        WHERE (status LIKE '${status}') AND
            (category LIKE '${category}');`;
      break;
    case priority !== undefined && status !== undefined:
      getQuery = `
        SELECT id,todo,priority,status,category,due_date As dueDate
        FROM todo
        WHERE (priority LIKE '${priority}') AND
         (status LIKE '${status}');`;
      break;
    case status !== undefined:
      getQuery = `
        SELECT id,todo,priority,status,category,due_date As dueDate
        FROM todo
        WHERE 
         status LIKE '${status}';`;
      break;

    default:
      getQuery = `
        SELECT id,todo,priority,status,category,due_date As dueDate
        FROM todo
        WHERE (priority LIKE '${priority}') OR
                (status LIKE '${status}') OR
                (category LIKE '${category}') OR 
                (due_date LIKE '${formatDate}') OR
                todo LIKE '%${search_q}%';`;
  }

  const todoDb = await db.all(getQuery);
  response.send(todoDb);
});
//get todo by id
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodo = `
    SELECT id,todo,priority,status,category,due_date As dueDate
    FROM todo
    WHERE id = ${todoId};`;
  const dbTodo = await db.get(getTodo);
  response.send(dbTodo);
});

//get todo by date
app.get("/agenda/", async (request, response) => {
  try {
    const { date } = request.query;
    let formatDate = format(new Date(date), "yyyy-MM-dd");
    const agentaQuery = `
        SELECT id,todo,priority,status,category,due_date As dueDate
        FROM todo
        WHERE due_date = '${formatDate}';`;
    const dbDateTodo = await db.all(agentaQuery);
    if (dbDateTodo === undefined) {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      response.send(dbDateTodo);
    }
  } catch (e) {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

const postMethod1 = (request, response, next) => {
  let invalidTodo = "";
  const { priority } = request.body;
  if (priority !== undefined) {
    let prioritys = ["HIGH", "MEDIUM", "LOW"];
    const priorityIs = prioritys.some((each) => each === priority);
    if (priorityIs === false) {
      response.status(400);
      response.send("Invalid Todo Priority");
    } else {
      next();
    }
  } else {
    next();
  }
};

const postMethod2 = (request, response, next) => {
  let invalidTodo = "";
  const { status } = request.body;
  if (status !== undefined) {
    let prioritys = ["TO DO", "IN PROGRESS", "DONE"];
    const priorityIs = prioritys.some((each) => each === status);
    if (priorityIs === false) {
      response.status(400);
      response.send("Invalid Todo Status");
    } else {
      next();
    }
  } else {
    next();
  }
};

const postMethod3 = (request, response, next) => {
  let invalidTodo = "";
  const { category } = request.body;
  if (category !== undefined) {
    let prioritys = ["WORK", "HOME", "LEARNING"];
    const priorityIs = prioritys.some((each) => each === category);
    if (priorityIs === false) {
      response.status(400);
      response.send("Invalid Todo Category");
    } else {
      next();
    }
  } else {
    next();
  }
};

const postMethod4 = (request, response, next) => {
  try {
    const { dueDate } = request.body;
    if (dueDate !== undefined) {
      let formatDate = format(new Date(dueDate), "yyyy-MM-dd");
      console.log(formatDate);
      next();
    } else {
      next();
    }
  } catch (e) {
    response.status(400);
    response.send("Invalid Due Date");
  }
};
//post todo
app.post(
  "/todos/",
  postMethod1,
  postMethod2,
  postMethod3,
  postMethod4,
  async (request, response) => {
    const { id, todo, priority, status, category, dueDate } = request.body;
    let formatDate = format(new Date(dueDate), "yyyy-MM-dd");
    const updateQuery = `
    INSERT INTO
    todo (id, todo, priority, status,category,due_date)
  VALUES
    (${id},'${todo}', '${priority}', '${status}','${category}',${formatDate});`;
    await db.run(updateQuery);
    response.send("Todo Successfully Added");
  }
);
//insert APi
app.put(
  "/todos/:todoId/",
  postMethod1,
  postMethod2,
  postMethod3,
  postMethod4,
  async (request, response) => {
    const { todoId } = request.params;
    let updateColumn = "";
    const requestBody = request.body;
    switch (true) {
      case requestBody.status !== undefined:
        updateColumn = "Status";
        break;
      case requestBody.priority !== undefined:
        updateColumn = "Priority";
        break;
      case requestBody.todo !== undefined:
        updateColumn = "Todo";
        break;
      case requestBody.category !== undefined:
        updateColumn = "Category";
        break;
      case requestBody.dueDate !== undefined:
        updateColumn = "Due Date";
    }
    const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
    const previousTodo = await db.get(previousTodoQuery);
    let formatDate = format(new Date(previousTodo.due_date), "yyyy-MM-dd");
    const {
      todo = previousTodo.todo,
      priority = previousTodo.priority,
      status = previousTodo.status,
      category = previousTodo.category,
      dueDate = formatDate,
    } = request.body;

    const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category='${category}',
      due_date = '${dueDate}'
    WHERE
      id = ${todoId};`;

    await db.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
  }
);
//delete
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `
    DELETE FROM todo 
    WHERE id = ${todoId};`;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});
module.exports = app;
