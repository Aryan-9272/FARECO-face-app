//Connecting to Mongodb database using mongoose.

const mongoose=require("mongoose");

mongoose.connect("mongodb://localhost:27017/Fareco")
.then(()=>{
 console.log("Connection to database successful");
}).catch((e)=>{
 console.log(`Cannot connect to database :${e.message}`);
})

