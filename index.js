#!/usr/bin/nodemon
'use strict';

const fs = require('fs');
var nodemon = require('nodemon');
try {
  if (!fs.existsSync('.env')) {
    console.log('***************************************************');
    console.log('***Please run ./setup.sh or configure .env file!***');
    console.log('***************************************************');
    nodemon.emit('quit');
  }
} catch (err) { console.error(err) }
require('dotenv').config();
const http = require('http');
const https = require('https');
const express = require('express');
const Base64 = require('js-base64').Base64;
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const readline = require('readline');
const cmd = require('node-cmd');

const CLI = require('./modules/CLI.js');

const PORT = process.env.PORT || 3000;
const PORTS = process.env.PORTS || 8080;
const options = {
  key: fs.readFileSync(process.env.KEY),
  cert: fs.readFileSync(process.env.CERT),
};
const tokenExperation = '1d';

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.enable('trust proxy');

let users = JSON.parse(fs.readFileSync('db/0users.json'));
let status = {
  running:false,
  nvidia:"none",
  log:["none"]
};

//Web Front End
app.use(function (req, res, next) {
  if (req.secure) {
    // request was via https, so do no special handling
    next();
  } else {
    // request was via http, so redirect to https
    res.redirect('https://' + req.headers.host.split(':')[0] + ':' + PORTS + req.url);
  }
});
app.use(express.static('./public'));

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: './public' });
});

app.get('/dashboard', (req, res) => {
  res.sendFile('dashboard.html', { root: './public' });
});

app.post('/api/test', (req, res) => {
  console.log('test api hit')
  console.log('REQUEST', req.body)
  res.send(200)
});

app.post('/api/login', (req, res) => {
  console.log('login api hit')
  let loginInfoBase64 = Object.keys(req.body)[0];
  let loginInfoDecoded = Base64.decode(loginInfoBase64);
  let loginInfo = JSON.parse(loginInfoDecoded);
  let userName = loginInfo.username;
  let password = CLI.sha512(loginInfo.password);
  let authentication = checkUsers(userName, password);
  if (authentication != 'not authenticated') {
    console.log("User is authenticated");
    jwt.sign(authentication, options.key, { expiresIn: tokenExperation }, (err, token) => {
      if (err) {
        console.log("error:", err)
      }
      // console.log('RESPONSE:', res.json({jwToken: token}))
      res.json({ jwToken: token })
    });
  } else {
    console.log("Incorrect username or password");
    res.json({ jwToken: 'Not Authenticated' });
  }
});

app.post('/api/verify', verifyTokenAdmin, (req, res) => {
  res.json({ authenticated: 'true' })
});

app.post('/api/miner/start', verifyTokenAdmin, (req, res) => {
  nbminer_nicehash_etc()
  res.send(status);
});

app.post('/api/miner/stop', verifyTokenAdmin, (req, res) => {
  nbminer_nicehash_etc_stop("nbminer")
  res.send(status);
});

app.post('/api/miner/status', verifyTokenAdmin, (req, res) => {
  // console.log("sending status")
  res.send(status);
});

app.get('/admin', verifyTokenAdmin, (req, res) => {
  console.log("admin page hit")
  res.sendFile('admin/index.html', { root: './public' });
})

function serverIncriment() {
  let nodePackage = JSON.parse(fs.readFileSync('package.json'));
  let formatting = nodePackage.version.split('.');
  formatting[2]++;

  return nodePackage.version
}

app.listen(PORT, () => {
  console.log('HTTP Listening on port:', PORT, 'use CTRL+C to close.')
});

const server = https.createServer(options, app).listen(PORTS, function () {
  console.log('HTTPS Listening on port:', PORTS, 'use CTRL+C to close.')
  console.log('Server started:', new Date());
  console.log('Currently running on Version', serverIncriment());
  console.log('Type man to see a list of available CLI commands.');
});

// Admin console commands
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  if (input.split(' ')[0] === 'man') {
    CLI.manual();
  } else if (input.split(' ')[0] === 'md5') {
    console.log("md5:", CLI.md5(input.substr(input.indexOf(' ') + 1)))
  } else if (input.split(' ')[0] === 'sh1') {
    console.log("sha1:", CLI.sh1(input.substr(input.indexOf(' ') + 1)));
  } else if (input.split(' ')[0] === 'sha256') {
    console.log("sha256:", CLI.sha256(input.substr(input.indexOf(' ') + 1)));
  } else if (input.split(' ')[0] === 'sha512') {
    console.log("sha512:", CLI.sha512(input.substr(input.indexOf(' ') + 1)));
  } else if (input.split(' ')[0] === 'pbkdf2') {
    CLI.pbkdf2(input.substr(input.indexOf(' ') + 1));
  } else if (input.split(' ')[0] === 'start') {
    nbminer_nicehash_etc()
  } else if (input.split(' ')[0] === 'stop') {
    nbminer_nicehash_etc_stop("nbminer")
  } else if (input.split(' ')[0] === 'log') {
    read_log();
  } else if (input.split(' ')[0] === 'nvidia') {
    nvidia_status()
  } else if (input.split(' ')[0] === 'status') {
    console.log('Status:', status);
  } else if (input.split(' ')[0] === 'users') {
    console.log("Users:", users);
  } else {
    console.log(input, 'is not a valid input')
  };
});

function checkUsers(userName, password) {
  let userNameFound = false;
  let passwordMatches = false;
  for (let i = 0; i < users.length; i++) {
    if (userName === users[i].username) {
      userNameFound = true;
      if (password === users[i].password) {
        passwordMatches = true;
        return users[i];
      }
    }
  }
  if (userNameFound != true || passwordMatches != true) {
    return 'not authenticated';
  }
};

// Verify Token
function verifyToken(req, res, next) {
  // console.log("Verifying Token")
  // Get auth header value
  let bearerHeader = req.headers['authorization'];
  // Check if bearer is undefied
  if (typeof bearerHeader !== 'undefined') {
    // Split at the space
    let bearer = bearerHeader.split(' ');
    // Get toekn from array
    let bearerToken = bearer[1];
    // set the token
    req.token = JSON.parse(bearerToken)
    // Next middleware
    jwt.verify(req.token, options.key, (err, authData) => {
      if (err) {
        console.log('token error:', err)
        res.sendStatus(403);
      } else {
        // console.log("data:", authData.permissions)
        next();
      }
    })
  } else {
    // Forbidden
    console.log('Not Authorized')
    res.sendStatus(403);
  }
};

// Verify Token Admin
function verifyTokenAdmin(req, res, next) {
  // console.log("Verifying Token")
  // Get auth header value
  let bearerHeader = req.headers['authorization'];
  // Check if bearer is undefied
  if (typeof bearerHeader !== 'undefined') {
    // Split at the space
    let bearer = bearerHeader.split(' ');
    // Get toekn from array
    let bearerToken = bearer[1];
    // set the token
    req.token = JSON.parse(bearerToken)
    // Next middleware
    jwt.verify(req.token, options.key, (err, authData) => {
      if (err) {
        console.log('token error:', err)
        res.sendStatus(403);
      } else {
        if (authData.permissions === "admin") {
          next();
        } else {
          console.log('Not Authorized')
          res.sendStatus(403);
        }
      }
    })
  } else {
    // Forbidden
    console.log('Not Authorized')
    res.sendStatus(403);
  }
};

let lastLineRead = 0
function nbminer_nicehash_etc() {
  // cmd.runSync('./miners/NBMiner_Linux/start_nicehash_etc.sh');
  cmd.run('./miners/NBMiner_Linux/start_nicehash_etc.sh');
  status_check();
  status.running = true;
  lastLineRead = 0
}

function nbminer_nicehash_etc_stop(process) {
  cmd.run(`ps -ef | grep ${process} | grep -v grep | awk '{print $2}' | xargs kill`)
  status.running = false;
  lastLineRead = 0
}

function newest_log() {
  let logs = fs.readdirSync('./miners/NBMiner_Linux/logs');
  // console.log(logs[logs.length - 1]);
  return logs[logs.length - 1]
}

function read_log(){
  let newLog = './miners/NBMiner_Linux/logs/' + newest_log();
  // console.log("log returned:", newLog)
  async function processLineByLine() {
    const fileStream = fs.createReadStream(newLog);
    let currentLine = 0;
  
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.
  
    for await (const line of rl) {
      // Each line in input.txt will be successively available here as `line`.
      if (currentLine > lastLineRead){
        // console.log(`Line:${lastLineRead + 1} : ${line}`);
        let cleanLine = line.replace('[0m', '').replace('[49;35m', '').replace('[49;36m', '').replace('[49;31m', '').replace('[49;32m', '').replace('[49;97m', '')
        status.log.push(cleanLine);
        lastLineRead++;
        currentLine++;
      } else {
        currentLine++;
      }
    }
    // console.log(`Current:${currentLine}  Last:${lastLineRead}`);
  }
  processLineByLine();
}

function nvidia_status(){
  // cmd.run('nvidia-smi');
  cmd.run(`nvidia-smi`,
    function (err, data, stderr) {
      // console.log('the node-cmd dir contains : ', data)
      status.nvidia = data
    }
  );
}

function status_check(){
  setInterval( () => {
    nvidia_status();
    read_log()
  }, 5000);
}
