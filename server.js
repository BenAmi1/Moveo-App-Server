const express = require("express");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("./mongoose");
const CodeBlock = require("./models/codeBlock");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../client/build")));

const server = http.createServer(app);
const io = socketIo(server);

const userRoles = {};

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("joinCodeBlock", async ({ blockId }) => {
    if (!(socket.id in userRoles)) {
      const isMentor = Object.keys(userRoles).length === 0;
      userRoles[socket.id] = isMentor ? "mentor" : "student";
    }
    const role = userRoles[socket.id];
    socket.emit("roleAssignment", { isMentor: role === "mentor" });
    socket.join(blockId);

    try {
      const codeBlock = await CodeBlock.findById(blockId);
      if (codeBlock) {
        socket.emit("codeUpdate", codeBlock.code);
      }
    } catch (error) {
      console.error(error);
    }

    socket.on("codeChange", async ({ blockId, newCode }) => {
      socket.to(blockId).emit("codeUpdate", newCode);

      // Saving the changes of the student to DB
      try {
        await CodeBlock.findByIdAndUpdate(blockId, { code: newCode });
      } catch (error) {
        console.error(error);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
      delete userRoles[socket.id];
    });
  });

  socket.on("leaveCodeBlock", ({ blockId }) => {
    socket.leave(blockId);
  });
});

app.get("/api/codeBlocks/:id", async (req, res) => {
  try {
    const codeBlock = await CodeBlock.findById(req.params.id);
    if (codeBlock) {
      res.json(codeBlock);
    } else {
      res.status(404).json({ message: "CodeBlock not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/codeBlocks", async (req, res) => {
  const { _id, title, code } = req.body;
  const codeBlock = new CodeBlock({ _id, title, code });
  try {
    await codeBlock.save();
    res.status(201).json(codeBlock);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
