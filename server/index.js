const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const axios = require("axios");
const { HfInference } = require("@huggingface/inference");

dotenv.config();
const app = express();
app.use(express.json());


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));


const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);


const docSchema = new mongoose.Schema({
  file: String,
  content: String,
  updatedAt: { type: Date, default: Date.now },
});
const Documentation = mongoose.model("Documentation", docSchema);


app.post("/webhook", async (req, res) => {
  try {
    const { commits } = req.body;
    const changedFiles = commits.flatMap((commit) => commit.modified);

    for (const file of changedFiles) {
      const code = await getFileContent(file);
      const doc = await generateDocs(file, code);
      await Documentation.findOneAndUpdate({ file }, { content: doc }, { upsert: true });
    }

    res.status(200).send("Docs updated!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating docs.");
  }
});


async function generateDocs(filename, code) {
  try {
    const response = await hf.textGeneration({
      model: "Salesforce/codet5-small",
      inputs: `Generate documentation for the following code:\n\n${code}`,
    });

    return response.generated_text || "Documentation not available.";
  } catch (error) {
    console.error("Error generating documentation:", error);
    return "Failed to generate documentation.";
  }
}


async function getFileContent(file) {
  return "sample function code"; 
}


app.get("/docs", async (req, res) => {
  const docs = await Documentation.find();
  res.json(docs);
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(5000, () => console.log("Server running on port 5000"));
