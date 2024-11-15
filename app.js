const express = require("express")
const app = express()
const path = require("path")
const cors = require("cors")
const sqlite3 = require("sqlite3")
const {open} = require("sqlite")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
app.use(express.json())
app.use(cors())


const dbPath = path.join(__dirname,'database.db')
let database = null;
const port = 3004;
const initializeDBAndServer = async() => {
    try {
        database = await open({
            filename:dbPath,
            driver:sqlite3.Database
        })
        app.listen(port,()=>{
        console.log(`Server Running at:http://localhost:${port}/`)
    })
    } catch (error) {
        console.log("DB Error at:",error)
        process.exit(1)
    }
}

initializeDBAndServer()

//Register User

app.post("/signup/", async (request, response) => {
  const { username, password, email } = request.body;
  const encryptedPassword = await bcrypt.hash(password, 10);
  const getUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const userResponse = await database.get(getUserQuery);
  if (userResponse !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    const checkPasswordLength = password.length > 6;
    console.log(checkPasswordLength);
    if (checkPasswordLength === true) {
      const createNewUserWithData = `
      INSERT 
      INTO 
      user
      (username,password,email) 
      VALUES 
      (
        '${username}',
        '${encryptedPassword}',
        '${email}');`;
      await database.run(createNewUserWithData);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  }
});

//User Login

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserInfo = `SELECT * FROM user WHERE username='${username}';`;
  const userResponse = await database.get(getUserInfo);
  if (userResponse === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const checkIsPasswordMatched = await bcrypt.compare(
      password,
      userResponse.password
    );
    if (checkIsPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = await jwt.sign(payload, "My_Secret_Key");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//authentication

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
    //console.log(jwtToken);
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "My_Secret_Key", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//ADD task 

app.post("/task",async(request,response) => {
    const {task,status} = request.body;
    const checkTaskName = `SELECT * FROM taskList WHERE task='${task}';`;
    if(checkTaskName === undefined){
        response.status(400);
        response.send("Task already exist")
    }
    const addTaskQuery = `INSERT INTO taskList(task,status) VALUES('${task}','${status.toUpperCase()}');`;
    const addTaskQueryResponse = await database.run(addTaskQuery);
    const taskId = addTaskQueryResponse.lastID;
    response.send(`Task added Successfully with ID: ${taskId}`);
})

//GET all tasklist 

app.get("/task",async(request,response) => {
    const getAllTasks = `SELECT * FROM taskList`;
    const allTasksResponse = await database.all(getAllTasks);
    response.send(allTasksResponse)
})

//UPDATE specific task 

app.put("/task/:taskId",async(request,response) => {
    const {taskId} = request.params;
    const {task,status} = request.body;
    
    const updateTaskQuery = `
        UPDATE taskList 
        SET 
            task='${task}',
            status='${status}' 
        WHERE id=${taskId}
        `;

    await database.run(updateTaskQuery)
    response.send("Task updated Successfully")
})

//SPECIFIC task

app.get("/single_task/:taskId",async(request,response) => {
    const {taskId} = request.params;
    const getAllTasks = `SELECT * FROM taskList WHERE id=${taskId}`;
    const allTasksResponse = await database.all(getAllTasks);
    response.send(allTasksResponse)
})

//delete Specific Task 

app.delete("/task/:taskId",async(request,response) => {
    const {taskId} = request.params;
    const getTaskWithId = `SELECT * FROM taskList WHERE id=${taskId};`;
    const getTaskWithIdResponse = await database.get(getTaskWithId);
    if(getTaskWithIdResponse ===undefined){
        response.status(400)
        response.send("Invalid Task Id,try again with valid id")
    }else{
        const deleteTaskQuery = `DELETE FROM taskList WHERE id=${taskId}`;
        await database.run(deleteTaskQuery)
        response.send("Task Deleted Successfully");
    }
})

//User Profile

app.get("/profile/", authenticateToken, async (request, response) => {
  let { username } = request;
  const selectUserQuery = `SELECT * FROM user WHERE username='${username}'`;
  const userDetails =await database.get(selectUserQuery);
  response.send(userDetails);
});