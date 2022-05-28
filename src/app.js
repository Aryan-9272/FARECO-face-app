/*The main section of backend where all requests will be handeled by the serever*/

/*<---------Requiring all the necessary modules----------->*/
const express=require("express");               //Requiring express for creating express server.
const path=require("path");                     //Requiring path for concatinating relative paths with the directory path.
const hbs=require("hbs");                       //Requiring handlebars for templating.
require("./database/connections");              //Connecting to mongoDB. 
const User=require("./models/users");           //Requiring user schema.
const cookieParser=require("cookie-parser");    //For parsing cookies.
const faceapi=require('face-api.js');           //The main API with all the required functions for face recognition.
const {guideHeading,
        guideImage,                             //Requiring the strings for serving the dynamic content.
        guideDescription,
        labels}=require("./libraries");
const jwt=require("jsonwebtoken");              //Requiring jwt for cookies.
/*<----------Requiring all the necessary modules---------->*/


/*<--------Initialising the most important constant variables------->*/
const app=express();                                              //Creating the express server.
const port=process.env.PORT || 3000;                              //Assigning port.
const threshold=[0.33,0.31,0.31,0.35];                            //This part will be used at line 355. These are the threshold values for each stage for matching the faces. 
const staticDir=path.join(__dirname,"../public");                 //Creating the path for serving static files {images/CSS} for templates.
const viewPath=path.join(__dirname,"../templates/views");         //Creating the path for views which has all the main hbs templates.       
const partialPath=path.join(__dirname,"../templates/partials");   //Creating the path for partial templates.
const appPath=path.join(__dirname,"../Fareco-app");               //Creating the path for serving the main app.
const secretKey="farecofacerecongnitionapparyanraj";              //Secret key for jwt.
/*<--------Initialising the most important constant variables------->*/

/*<---------Registering middlewares--------->*/
app.use("/static",express.static(staticDir));       //Static middleware for images and styles for templates.
app.use("/fareco",express.static(appPath));         //Static middleware for the main app. 
app.set("view engine","hbs");                       //Setting view engine to handlebars.
app.set("views",viewPath);                          //Setting the views to the custom view path for the templates.
hbs.registerPartials(partialPath);                  //Registering partials path for using partial templates.
app.use(express.urlencoded({extended:false}));      //For parsing form data recieved by the server.
app.use(cookieParser());                            //For parsing cookies.
app.use(express.json({limit:"1mb"}));               //For parsing face descriptors with JSON payloads sent by the client using fetch POST.
/*<---------Registering middlwares--------->*/


/*<-----------Handling requests and responses------------>*/

/*<--------------Handling simple requests and responses------------>*/
app.get('/',(req,res)=>{               
    res.render("home");            //rendering home page.
})

app.get('/home',(req,res)=>{    
    res.render("home");            //rendering home page.
})

app.get('/login',(req,res)=>{      
    res.render("login");           //rendering login page.
})

app.get('/register',(req,res)=>{
    res.render("register");        //rendering registetration page.
})

app.get('/about',(req,res)=>{
    res.render("about");           //rendering about page. 
})
/*<--------------Handling simple requests and responses------------>*/


/*<---------------Handling main requests and responses-------------->*/

/*<--------------Handling the registration request after form data has been sent by the client through POST--------------->*/
app.post('/register',async(req,res)=>{
    try{
       if(req.body.username.length<5||req.body.username.length>15)          //Check if the username length is valid else throw an error.
        throw new Error("Username must contain minimum 5 letters and maximum 15 letters.");

       if(req.body.password.length<5||req.body.password.length>15)          //Check if the password length is valid else throw an error.
        throw new Error("Password must contain minimum 5 letters and maximum 15 letters.");

       res.clearCookie("jwt");             //If above statements are valid then clear the previous cookies of the client and proceed.
       const user=await User.findOne({username:req.body.username});  //Check if the username has already been taken or not.
       
        if(user==null||user.registrationStat==false){    //If it is not taken or if the username has been taken but they have not completed the registration process.
            if(user!=null)                               //If username exist and they have not completed the registration process 
                await user.remove();                     //then delete that user document from database and assing the current user the requested username.
            
            const newUser=new User({                     //Creating a new user document in database.
            username:req.body.username,                  //Assigning username.   
            password:req.body.password,                  //Assigning password.
            totalStages:req.body.security,               //Assigning the total stages of security they have opted for {levl-1=1,;levl-2=2;levl-3=1}
            registrationStat:false,                      //Set the registration status to false until they have given their face descriptors.   
            appMode:"register",                          //Set the app mode to register.
            currentStage:1                               //Set the current stage to 1.
            });
            const token=jwt.sign({_id:newUser._id.toString()},secretKey);   //Create a json web token for cookies.
            newUser.token=token;        //Assign jwt to user document.
            await newUser.save();       //Save the document.
            res.cookie('jwt',token);    //After successful saving send the cookies with key = jwt so that main app and other requests can identify the user's currentStage and registration status.
            res.redirect("guide");      //Redirect to guide which will serve the instructions on how to proceed with the main app.   
        }                                              
        else
            throw new Error("Username has already been taken.");  //The else part of the if statement at line 79.      
    }
    catch(error){
        // console.log(error);          
        res.render("error",{                            //Catch any error from the try block and render the error page with the error message.
            errorMsg:error.message
        });                                             //Note: The cookie step can be made more secured by adding expiration to jwt and cooikes.
    } 
})
/*<--------------Handling the registration request after form data has been sent by the client through POST--------------->*/

/*<--------------Handling the guide request for giving instructions to the user during registration part---------------->*/
app.get('/guide',async(req,res)=>{
    try{                                          //Check if the cookie sent by the register/login request exist or not. 
        if(req.cookies.jwt==undefined)             
            throw new Error("The session has expired.");    //If it does not exist then throw error.

        else{                                           //else go to this part.{The else block can be omitted since throw statement will directly send the flow to catch part. I have included it just for better debugging of the code.}
            const user=await User.findOne({token:req.cookies.jwt});     //Check that user from the cookie in database.
            
            if(user==null)                              
                throw new Error("User does not exist"); //If User does not exist throw error. This error will pop up if jwt cookies have been altered.
            
            if(user.registrationStat==true)             //If User has completed the registration{Sent the face descriptors.} then no need to show the guide, throw the error.
                throw new Error("User has already registered.");

            res.render("guide",{                        //Else render guide giving instructions to user for each scanning stage.
                heading:guideHeading[user.currentStage-1],
                image:guideImage[user.currentStage-1],              //Dynamically rendering guide for each stage of the scanning process which has an anchor link to the main app.
                para1:guideDescription[user.currentStage-1][0],
                para2:guideDescription[user.currentStage-1][1],
                para3:guideDescription[user.currentStage-1][2],
                para4:guideDescription[user.currentStage-1][3]
            });
        }
    }
    catch(err){
        // console.log(err.message);
        res.render("error",{                        //Render the error page if any error was thrown by the try block.
            errorMsg:err.message
        });
    }
})
/*<--------------Handling the guide request---------------->*/

/*<--------------Handling the request that sends the main-app to the client------------->*/
/*<--------------Send the files for the main-app after the guide of the current stage has been read by the user during registration or user has opted for logging in>*/
app.get("/main-app",async(req,res)=>{
    try{
        if(req.cookies.jwt==undefined)             //Check if the cookie exist else throw the error.
            throw new Error("The session has expired.");

        else{
            const user=await User.findOne({token:req.cookies.jwt}); //Find the user from the jwt and if they exist in the database then send the index file of the main-app.
           
            if(user!=null)                          //If user exist then send the index file of the main app.
            res.status(200).sendFile(appPath+"/index/index.html");
            else                                    //Else throw the error.
            throw new Error("User does not exist");
        }
    }
    catch(err){
        // console.log(err.message);
        res.render("error",{                           //Render the error page.
            errorMsg:err.message
        });
    }
})
/*<--------------Handling the request that sends the main-app to the client------------->*/


/*<---------------Requests sent by the main app on the client side by fetch api--------------->*/
/*<---------The first request sent by the main app using the fetch api for geting user's current stage and app mode information------>*/
//Note: No sensitive data is being shared from the server by this request. 
app.get('/getUserInfo',async(req,res)=>{     
    try{       
        const info=await User.findOne({token:req.cookies.jwt});  //Searches the user from the cookie sent by the main-app  
        if(info==null)
        throw new Error("The session has expired.");

        res.send({currentStage:info.currentStage,appMode:info.appMode}); //Sends currentStage and app mode for the proper functioning of main-app.
    }
    catch(error){
        // console.log(error);                  //Uncomment to see if any error has occured.
        res.render("error",{
            errorMsg:error.message
        })
    }
})
/*<---------The first request sent by the main app using the fetch api for geting user's current stage and app mode information------>*/

/*<---------The request sent by the main app during the registration phase of the user------>*/
//This is the request that sends the face-descriptors of the user to the server from the main-app during registration part.
app.post('/sendData',async(req,res)=>{
    try{
        const user=await User.findOne({token:req.cookies.jwt}); //Finds the user using the cookie.
        if(user.registrationStat==false){            //Checks if registration is false {User has already sent the descriptors previously or not}.
            if(user.currentStage<4){                 //Checks if currentStage is less than 4.{Because stages less than 4 only stores descriptors of the user whereas in stage 4 the descriptors along with the expression has to be stored.}
                user.faceDescriptors.push({ 
                    label:labels[user.currentStage-1],  //If the stage is less than 4 store only the descriptors.
                    descriptors:req.body
                });
            }
            else{
                user.faceDescriptors.push({
                    label:labels[user.currentStage-1],  //If the stage is equal to 4 store the descriptors and the secret expression.
                    descriptors:req.body.descriptor
                });
                let expMean=0;
                req.body.labelExpression.expression.forEach(element=>{  //Since an array consisting of 50 values of expression ratio will be sent by the main app we store the mean value of those ratios.
                    expMean+=element;
                });
                expMean=expMean/50;                             //Storing the mean value of the face expression ratios along with the label.
                user.faceExpressions={                          //The label can be happy, surprised,angry depending what the user has chosen.
                    label:req.body.labelExpression.label,
                    expressionMean:expMean
                }
            }
            user.currentStage++;                                //Increment the current stage of the user after successful storing of the face descriptors/expressions.    
            if(user.currentStage==user.totalStages+1){          //If the user has completed all the stages of registration then      
                user.registrationStat=true;                     //Set the registration status of the user to true an send the url of dashboard.
                await user.save();                              //Window.url.href present in the main app will redirect the user to dashboard.
                res.status(200).send({url:'/dashboard'});
            }
            else{
                await user.save();                              //If the user has not completed the registration process
                res.status(200).send({url:"/guide"});           //Then the user will be redirected to the guide page.
            }
        }
    }
    catch(err){
        // console.log(err.message);                            //Uncomment to see if any error has occured.
    }
})
/*<---------The request sent by the main app during the registration phase of the user------>*/
/*<---------------Requests sent by the main app on the client side by fetch api--------------->*/


/*<----------Handeling dashboard request----------->*/
app.get('/dashboard',async(req,res)=>{
    try{
        if(req.cookies.jwt==undefined)         //Check the cookies.
            throw new Error("The session has expired.");

        else{
            const user=await User.findOne({token:req.cookies.jwt}); //If the cookies exist then find the user.
            if(user==null)
            throw new Error("The user does not exist");             //If the user has not been found, the cookies are not original hence pop this error.

            res.clearCookie("jwt");                            //Clear the existing cookie.
            if(user.currentStage==user.totalStages+1&&user.registrationStat==true){ //Check if user has completed all the stages.
                let mode,exp,lvl;
                if(user.appMode=="register")                        //Check the app mode for showing dynamic content. 
                    mode="Registration";
                else
                    mode="Login";
                if(user.totalStages==4){
                    exp=user.faceExpressions.label[0].toUpperCase()+user.faceExpressions.label.slice(1);    //Display the emotion if  total stages=4
                    lvl=3;                                           //Assign the level user had selected during registration.
                }
                else if(user.totalStages==3||user.totalStages==2){              
                    exp="None";                                      //Assign the level user had selected during registration.
                    lvl=2;
                }
                else{
                    exp="None";                                     //Assign the level user had selected during registration.
                    lvl=1;
                }
                res.render("dashboard",{
                    mode:mode,                                      //Render the dashboard using dynamic data.
                    uname:user.username,
                    ulevel:lvl,
                    uexp:exp
                });
                user.currentStage=1;                                //Set the currenStage=1.
                await user.save();                                  //Save the changes.
            }
            else
                throw new Error("Please complete the login/registration process.");         //Throw the error if user has not completed all the stages.
        }
    }
    catch(err){
        // console.log(err.message);
        res.render("error",{
            errorMsg:err.message                            //Render error page.
        });
    }
})
/*<----------Handeling dashboard request----------->*/

/*<---------------Handling the data sent during login--------------->*/
app.post('/login',async(req,res)=>{
    try{
        res.clearCookie("jwt");                   //Clear any previous cookies.
        const user=await User.findOne({username:req.body.username});   //Check for username sent by the form data during login.
        if(user==null||user.registrationStat==false){                  //Check if user document exist or if it exist but has not the registeration process.
            if(user!=null)                                              
                await user.remove();                        //If user has not completed the registration process then remove that incomplete user document
            throw new Error("User does not exist.");        //Throw the error if above if is true.
        }

        else{
            user.appMode="login";                           //Else if the user exist and they have completed the registration process.
            const token=jwt.sign({_id:user._id.toString()},secretKey);  //Assign a new jwt.
            user.currentStage=1;                            //Set the current stage of user as 1.
            user.token=token;                               //Set the new jwt to user document.
            await user.save();                              //Save the changes.
            res.cookie('jwt',token);                        //Send the cookie 
            res.redirect('main-app');                       //Redirect to the main app at line 147.
        }
    }
    catch(error){
        //console.log(error.message);
        res.render("error",{
            errorMsg:error.message
        });
    }
})
/*<---------------Handling the data sent during login--------------->*/

/*<=====================The Main part where faces will be matched=================>*/
//Note: This request is sent by the main app just like previous requests at line 174 and 187.
app.post('/matchData',async(req,res)=>{
    try{
        const user=await User.findOne({token:req.cookies.jwt});    //Check the cookies and find the user.
        const label=user.faceDescriptors[user.currentStage-1].label;    //Find the label of the face descriptors depending on the current stage.
        const descriptors=user.faceDescriptors[user.currentStage-1].descriptors;    //Get those descriptors from the database which is stored as an array of 50 elements of descriptor objects. Each object has 128 values corresponding to different parts of the face.  
        const descriptorArray=descriptors.map(descObject=>{                         
            return new Float32Array(Object.values(descObject));             //Converting the object array to array of arrays.
        })

        const labeledDesript= new faceapi.LabeledFaceDescriptors(label,descriptorArray);    //Making a labeled face descriptor object from the above array of arrays.
        const faceMatch=new faceapi.FaceMatcher(labeledDesript);        //Making a face matcher object which has the required method for computing mean euclidean distance.
        let recievedData=[];        //creating an array for storing the received data from the user.
        let  recievedDesc=[];       //Another array for converting the above array into array of arrays.

        if(user.currentStage<4)     //Checking if the stage is less than 4 as if it is then only descriptors will be recieved and if it is equal to 4 then descriptors along with expression will be recieved.
            recievedData=req.body;  //recieved data is of the form array of objects of face descriptors sent by the user.

        else
            recievedData=req.body.descriptor;   //if stage is equal to 4.
        

        recievedData.forEach(element=>{
        const arr=new Float32Array(Object.values(element)); //converting the array of objects to array of arrays.
        recievedDesc.push(arr);
        });

        let descMean=0;             //Initialisng the main comparison variable for the mean distance.
        recievedDesc.forEach((desc)=>{      //For each recieved array element, calculate the mean euclidean distance with descriptor array made using the descriptors from the database.
            descMean+=faceMatch.computeMeanDistance(desc,descriptorArray);  //add that mean euclidean distance for each array of array of arrays of received face descriptors.
        })
        descMean=descMean/50;       //after adding all the distances, calculate the mean.
        // console.log(descMean);   //Uncomment to see the mean distance, the lower the value the closer the face is to the original face stored during registration.

        if(descMean<threshold[user.currentStage-1]){    //Compare this mean with threshold value defined at line 22 for each stage. For experimentation these threshold values can be changed. 
         //The lower the threshold value, more strict will be the checking for the face and more accurate the result would be but the user must orient the face in the same way as it was during the registration procedure.
            if(user.currentStage<4)         //Check if the user's current stage is less than 4 as only face descriptor mean will be compared.
                user.currentStage++;        //if the stage is less than 4 and descriptor mean is less than threshold,increment the current descriptor.
            else{                           //else if the total stage=4 then.
                const expLabel=req.body.labelExpression.label;  //get the label for face expression{happy,surprised and angry} from the data sent by the user.
                const expressionArray=req.body.labelExpression.expression;//get the array corresponding to this label sent by the user.
                if(expLabel!=user.faceExpressions.label)        //If the expression label sent by the user is not equal to the label stored in the database during registration. 
                    throw new Error("Incorrect secret expression choice");      //throw error.
                else{
                    let recievedExpMean=0;      //else initialised expression mean with 0. 
                    req.body.labelExpression.expression.forEach(element=>{
                    recievedExpMean+=element;           //calculate the sum of the expression ratios sent by the user. 
                });
                recievedExpMean=recievedExpMean/50;     //take the mean.
                if(recievedExpMean>=user.faceExpressions.expressionMean||user.faceExpressions.expressionMean-recievedExpMean<=0.15) //If the calculated mean is greater than the stored mean or the difference is 0.1 then
                    user.currentStage++;        //Increment the current status.
                else
                    throw new Error("Secret expression did not match");     //else throw the error. Note:Every else block associated with throw block can be omitted as throw transfers the flow to catch. I have included it just for better debugging purpose.
                }

            }

            await user.save();  //save the changes.
            if(user.currentStage==user.totalStages+1)
                res.status(200).send({url:"/dashboard"});   //If the face matched and the user has completed all the stages then send the dashboard link.
            else
                res.status(200).send({url:'main-app'});     //else the face matched but they have not completed all the stages, send the main-app link and repeat all the above process.
        }
    
        else
            throw new Error("The face did not match");      //else throw an error that face did not match.
    }
    catch(err){
        // console.log(err);                                //any error thrown can be seen here.
        res.status(200).send({url:'fail'});                 //if any error occurs then send the fail url.
    }
})
/*<=====================The Main part where faces will be matched=================>*/

/*<------------------Handling the failed login part------------------->*/
app.get('/fail',async(req,res)=>{
    try{
        if(req.cookies.jwt==undefined)
            throw new Error("The session has expired.")         
        const user=await User.findOne({token:req.cookies.jwt});
        if(user.registrationStat==false)
            throw new Error("Please complete the registration process.")
        res.render("login-fail");       //Render login-fail page in case face did not match.
    }
    catch(err){
        // console.log(err.message);
        res.render("error",{               
            errorMsg:err.message});
    }
})


app.post('/fail',async(req,res)=>{
    try{
        if(req.cookies.jwt==undefined)
            throw new Error("The session has expired.") ;

        const user=await User.findOne({token:req.cookies.jwt});
        if(req.body.password===user.password){          //match the passoword sent by the form.
            user.currentStage=user.totalStages+1;       
            await user.save();
            res.redirect("dashboard");                  //Redirect to dashboard.
        }

        else
            throw new Error("Password did not match");
    }
    catch(err){
        // console.log(err.message);
        res.render("error",{
            errorMsg:err.message
        });
    }
})
/*<------------------Handling the failed login part------------------->*/
/*<---------------Handling main requests and responses-------------->*/
/*<-----------Handling requests and responses------------>*/


app.listen(port,()=>{
    console.log(`Listening to port ${port}`)    //Listening to port.
});