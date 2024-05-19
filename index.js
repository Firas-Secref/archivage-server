const cors = require('cors');
const express = require('express');
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();



const {Client} = require("pg");

const client = new Client({
    host: "localhost",
    user: "postgres",
    port: 5432,
    database: "archive",
    password: "00000000"
})
client.connect();

const db = require("./models/app");
db.sequelize.sync()
    .then(() => {
        console.log("Synced db.");
    })
    .catch((err) => {
        console.log("Failed to sync db: " + err.message);
    });


const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, 'uploads');
    },
    filename: (req, file, callback) => {
        callback(null, `${file.originalname}`);
    }
})

const upload = multer({storage})
const pdfParse = require('pdf-parse');
app.use(express.json());

const corsOpts = {
    origin: '*',

    methods: ['GET', 'POST', 'DELETE', 'PUT'],

    allowedHeaders: ['Content-Type'],
};
const Folder = db.folder;

app.use(cors(corsOpts));


app.get('/', (req, res) => {
    console.log("hello")
});


app.get('/findAll', (req, res) => {
    Folder.findAll()
        .then(data => {
            res.status(200).send(data);
        })
        .catch(err => {
            res.status(500).send({
                message:
                    err.message || "Some error occurred while retrieving tutorials."
            });
        });
});



app.post('/create', (req, res) => {
    const file = {
        fileName: req.body.fileName,
        filePath: req.body.filePath,
        fileTopic: req.body.fileTopic
    }
    Folder.create(file)
        .then(data => {
            res.send(data);
        })
        .catch(err => {
            res.status(500).send({
                message:
                    err.message || "Some error occurred while creating the Tutorial."
            });
        });
});

app.post("/upload", upload.single("file"), async (req, res) => {

    fs.readFile("uploads/" + req.file.filename, {encoding: 'base64'}, async (err, data) => {
        if (err) {
            throw err;
        }
        const pdfText = await pdfParse("uploads/" + req.file.filename)
        const chatCompletion = await getGroqChatCompletion(pdfText.text);
        const existingFile = await Folder.findAll({ where: { filePath: req.file.path } })
        console.log(existingFile)
        const file = {
            fileName: req.file.filename,
            filePath: req.file.path,
            fileTopic: chatCompletion.choices[0]?.message?.content
        }
        process.stdout.write(chatCompletion.choices[0]?.message?.content || "");


        // console.log(req.file)
        if (existingFile.length ==0){
            Folder.create(file)
            res.status(200).send({msg: "LOADED SUCCESSFULLY", article: file, toastMessage: `Saved with ${chatCompletion.choices[0]?.message?.content} articles`})
        }
        else {
            res.status(200).send({msg: "LOADED SUCCESSFULLY", article: file, toastMessage: `Already saved with ${chatCompletion.choices[0]?.message?.content} articles`})
        }

    })

})

app.get('/downloadFile/:path', (req, res, next) => {

    const file = path.resolve("./uploads", req.params.path)

    console.log(req.params.path)

    res.download(file, `content.pdf`, err => {
        if (err){
            next(err)
        }
    })
})



app.listen(8085, () => {
    console.log('server started');
});
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
});

function base64_encode(file) {
    // read binary data
    let bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}

const Groq = require("groq-sdk");
const groq = new Groq({
    apiKey: "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"
})

async function getGroqChatCompletion(text) {
    return groq.chat.completions.create({
        messages: [
            {
                role: "user",
                content: "hello i need one word answer ! what is the main topic between these options (historic or sports or civilian) that corresponds with this text: "+text
                // content: "hello "
            }
        ],
        model: "llama3-8b-8192"
    });
}