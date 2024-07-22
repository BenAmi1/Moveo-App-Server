const mongoose = require("mongoose");

const codeBlockSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  code: { type: String, required: true },
});

const CodeBlock = mongoose.model("CodeBlock", codeBlockSchema);

module.exports = CodeBlock;
