const express = require('express');
const cors = require('cors');
const app = express();
const port = 5000;


app.use(cors());
app.use(express.json());

app.use(
    cors({
        origin: 'http://localhost:3000',
    })
)

app.listen(5000, () => {
      console.log(`Server is running on port ${port}`);
    });
app.get("/api/hi", (req,res) => {
    res.json({message: "Hello"});
})
