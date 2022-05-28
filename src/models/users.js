/*Defining user schema*/

const mongoose=require("mongoose");

const userSchema=new mongoose.Schema({
    username:{
        type:String,
        required:true,
    },

    password:{
        type:String,
        required:true,
    },

    totalStages:{
        type:Number,        //Total stage set by the user {lvl-1=1;lvl-2=2;lvl-3=1}. Max 4 stages.
        required:true
    },

    registrationStat:{      //To check if the user has completed the registration process {sent the face descriptors}.
        type:Boolean
    },

    appMode:{               //To check if the main app is used for logging in or for registering.
        type:String
    },

    currentStage:{          //For checking the current stage.
        type:Number
    },

    faceDescriptors:{       //For storing the face descriptors. Each descriptor contains an object of 128 float values each corresponding to differnt parts of the face.
        type:[Object]       //For each stage 50 of them will be stored along with the label.{stage-1:center, stage-2:left, stage-3:right, stage-4:center}
    },
                            //Applicable for stage-4 only.
    faceExpressions:{       //For storing the face expression along with label{happy, surprised and angry}.
        type:Object         //The mean value of the expression ratio will be stored.
    },
    token:{
        type:String         //jwt for cookies.
    }
});

const User=new mongoose.model("User",userSchema);

module.exports=User;