//Connecting to Mongodb database using mongoose.

const mongoose=require("mongoose");

mongoose.connect("mongodb+srv://aryan:aryan@cluster0.ahodsby.mongodb.net/Fareco?retryWrites=true&w=majority")
.then(()=>{
 console.log("Connection to database successful");
}).catch((e)=>{
 console.log(`Cannot connect to database :${e.message}`);
})

