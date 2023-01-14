/*<------------Acquiring all the required elements------------->*/
const videoCont=document.getElementById("video-container");
const video=document.getElementById("video");
const mainScreen=document.getElementById("main-screen");
const mainImage=document.getElementById("main-img");
const mainDescription=document.getElementById("description");
const errorScreen=document.getElementById("error-screen");
const loadingScreen=document.getElementById("loading");
const loadingDescription=document.getElementById("loading-description");
const focusCont=document.getElementById("focus-icons-container");
const emotionScreen=document.getElementById("emotion-screen");
const emotion=document.getElementsByClassName("emotion-card");
let vidStream,emotionVal;
/*<------------Acquiring all the required elements------------->*/

/*<-------------------Strings used for different stages---------------->*/
const Decriptions=["Frontal view scan","Left view scan","Right view scan","Emotion detection"];
const imageSrc=["frontal.jpeg","left.jpeg","right.jpeg","emotions.png"];
/*<-------------------Strings used for different stages---------------->*/

/*<-------------------Initial display---------------->*/
video.style.display="none";
mainScreen.style.display="none";
errorScreen.style.display="none";
loadingScreen.style.display="flex";     //showing loading screen.
/*<-------------------Initial display---------------->*/

/*<-------------------Loading the required models.---------------->*/
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('fareco/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('fareco/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('fareco/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('fareco/models'),
]).then(getInfo)
.catch(err=>{
    // console.log(err);
    alert(err.message);
});
/*<-------------------Loading the required models.---------------->*/

let UserInfo;   //Will be used for getting user data from the server.
//Note: No sensitive data will be recieved. Only the current stage and the app mode will be recieved.


/*<-------------------Getting the user information---------------->*/
async function getInfo(){
    UserInfo=await(await fetch("/getUserInfo")).json();     //Getting the user info using fetch api.
    mainDescription.innerText=Decriptions[UserInfo.currentStage-1]; //Deciding main screen contents based on the current stage of user.
    mainImage.src=`fareco/Face-images/${imageSrc[UserInfo.currentStage-1]}`;
    if(UserInfo.currentStage==1||UserInfo.currentStage==4)
    {
        focusCont.children[1].style.backgroundColor="green";       //Deciding the main focus circle based on the current stage. 
    }
    else if(UserInfo.currentStage==2)
    {
        focusCont.children[0].style.backgroundColor="green";
    }
    else if(UserInfo.currentStage==3)
    {
        focusCont.children[2].style.backgroundColor="green";
    }
    repeatProcess();     //This fucntion is named so because it will be called again when any error occurs during scan to restart the application.
}
/*<-------------------Getting the user information---------------->*/


function repeatProcess(){
    loadingScreen.style.display="none";     
    mainScreen.style.display="flex";    //The main screen now is visible.
}

/*<-------------------Adding event listener to the main screen.---------------->*/
mainScreen.addEventListener('click',async()=>{
    if(mainScreen.style.display!="none"){   //If main has popped up then
        if(UserInfo.currentStage==4){
            mainScreen.style.display="none";
            emotionScreen.style.display="flex";   //If the current stage is 4 display expression screen.
        }
        else{
            mainScreen.style.display="none";      //Else hide the main screen
            scanPrep();                           //And start preparing for the scan.
        }
    }
});
/*<-------------------Adding event listener to the main screen.---------------->*/


/*<-------------------Adding event listener to expression elements.---------------->*/
for(i=0;i<3;i++){
    emotion[i].addEventListener("click",(e)=>{
        emotionVal=e.target.id;
        emotionScreen.style.display="none";     //If an expression is chosen then start preparing for the scan.
        scanPrep();
    });
};
/*<-------------------Adding event listener to expression elements.---------------->*/


/*<-------------------Preparing for scan.---------------->*/
async function scanPrep(){
    loadingDescription.innerText="Preparing for scan";
    loadingScreen.style.display="flex";
    video.style.opacity=0;              //Start the loading screen and display it until the face is available for scanning.
    video.style.display="initial";
    vidStream=await startCam();         //Start the cam. Defined at line 248.
}
/*<-------------------Preparing for scan.---------------->*/


video.addEventListener("playing",scanFace); //If the video starts playing start scanning.

/*<-------------------The main scanning function.---------------->*/
async function scanFace(){
    const width=getComputedStyle(video).getPropertyValue('width');  //Getting width and height of the video element.
    const height=getComputedStyle(video).getPropertyValue('height');
    
    const canvas=faceapi.createCanvasFromMedia(video);          //Creating a canvas to display detection box.
    videoCont.appendChild(canvas);

    const displaysize={width :parseFloat(width), height:parseFloat(height)};
    faceapi.matchDimensions(canvas,displaysize);       //Matching dimensions of canvas and video element.
    
    let faceExpression=[];          //Array for storing face expressions.
    let faceDescriptorArray=[];     //Array for storing face descriptors.
    let startScanTime=0;            //Time from which scanning must start after loading has been completed later set to 0.5s.{Since sometimes initial scanning might give null values.}  
/*<---------------Scanning the face every 100 milliseconds.---------------->*/
    let myInterval=setInterval(async() => {
    try{
/*<-------------------If 50 face descriptors have been recorded and stored in the array.---------------->*/
        if(faceDescriptorArray.length>=50){   
            clearInterval(myInterval);
            canvas.remove();
            stopCam(vidStream); 
            video.style.display="none";
            loadingDescription.innerText="Sending data";  //Display loading screen.
            loadingScreen.style.display="flex";

            if(UserInfo.currentStage<4)       //If current stage is less than 4
                postDescriptors(faceDescriptorArray.slice(0,50));     //Send only the first 50 descriptors to server.
            else{                             //If current stage is equal to 4
                faceExpressionArray={         //Send the first 50 descriptors and the secret expression to the server.
                descriptor:faceDescriptorArray.slice(0,50),
                labelExpression:{label:emotionVal,
                    expression:faceExpression.slice(0,50)}
                }
                postDescriptors(faceExpressionArray);     //The main sending function.
            }
        }
/*<-------------------If 50 face descriptors have been recorded and stored in the array.---------------->*/

/*<-------------------Recording the face descriptors.---------------->*/
        let tiny= new faceapi.TinyFaceDetectorOptions()   //Using the tiny face detector model.
        tiny._scoreThreshold=0.1;     //Setting the threshold value to 0.1 for detecting side faces. More the threshold value more strict will be the face detection. 
//Higher values may give errors during side face scan. This threshold value is different from the value set for calculating euclidean distance in app.js.

      /*<-------------------The main function that scans the face and records descriptor.---------------->*/
        const detections= await faceapi.detectSingleFace(video, 
        tiny).withFaceLandmarks().withFaceDescriptor().withFaceExpressions();
      /*<-------------------The main function that scans the face and records descriptor.---------------->*/
        if(startScanTime==5){
            alert("App is ready\nBegin Scan");
        }
        if(startScanTime>5){  //Start doing the below process after 0.5s have passed from the time of completion of loading.

        loadingScreen.style.display="none";   //Loading screen goes only after the above function has started the scan.
        video.style.opacity=1;        //If the scan has started then display user's webcam video.

        const resizeDetections=faceapi.resizeResults(detections,displaysize); //Resize the results obtained from the main scanning function.
        canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);    //Clear the canvas after each scan.

        if(UserInfo.currentStage==4){     //If the current stage is 4 also push the face expression.
            faceExpression.push(resizeDetections.expressions[emotionVal]);
        }

        faceDescriptorArray.push(resizeDetections.descriptor);    //Push the resize detections into the descriptor array.

        const box=resizeDetections.detection.box;
        const Drawbox=new faceapi.draw.DrawBox(box,{
        boxColor:'#f5f5f5'            //Drawing the detection box.
        });
        Drawbox.draw(canvas);
/*<-------------------Recording the face descriptors.---------------->*/ 
      }             

      startScanTime++;  //Increment the timer
    }
    catch(error){         //In case any error occurs.
        // console.log(error);  
        clearInterval(myInterval);  //Stop the scan.
        canvas.remove();            //Remove the canvas.
        stopCam(vidStream);         //Stop the webcam.
        video.style.display="none";
        errorScreen.style.display="flex";   //Show the error screen.
    }
    },100);
/*<---------------Scanning the face every 100 milliseconds.---------------->*/
}
/*<-------------------The main scanning function.---------------->*/

/*<----------------Displaying the error screen.---------------->*/
errorScreen.addEventListener('click',async()=>{
    if(errorScreen.style.display!="none")
    {   
        errorScreen.style.display="none";
        repeatProcess();    // Repeat the above process and scan again after clicking continue.
    }
});
/*<----------------Displaying the error screen.---------------->*/

/*<-------------------Post the descriptors to the server.---------------->*/
function postDescriptors(dataToServer){
    const options={
        method:'POST',
        headers:{                   //Defining options.
        'Content-Type':'application/json'
         },
        body:JSON.stringify(dataToServer)
       }
       
        let url;                    //Deciding which url to send data to depending on app mode.
        if(UserInfo.appMode=="register")
        url="/sendData";
        else if(UserInfo.appMode=="login")
        url="/matchData";

        fetch(url,options)          //Using the fetch function.
        .then((res)=>{
            if(res.ok){
            return res.json();      //Recieving the url from the server.{login-fail, main-app and dashboard}
            }
            else{
            throw new Error("Coundn't send data");  //If server failed to respond.
            }
        }).then((res)=>{
            const url=res.url;
            window.location.href=url;   //Redirecting to the recieved url.
        })
        .catch(err=>{
            alert(`An error has occured\n${err}`); //Alerting if any error has occured.
        })
    }
/*<-------------------Post the descriptors to the server.---------------->*/


/*<-------------------Starting the webcam.---------------->*/
async function startCam(){  
  return navigator.mediaDevices.getUserMedia({video :true}) //Note: For mobile browsers, navigator.mediaDevices works only when the website has SSL certificate. 
    .then(stream =>video.srcObject = stream)                //The app may not run on mobile browsers if the server is using local host.
    .catch(err=>alert(`Cannot open webcam \n${err}`));
}
/*<-------------------Starting the webcam.---------------->*/


/*<-------------------Stopping the webcam.---------------->*/
function stopCam(stream){
    video.srcObject=null;
    stream.getTracks().forEach(track=>{
        if (track.readyState=='live'&&track.kind==='video'){
            track.stop();
        }
    });
}
/*<-------------------Stopping the webcam.---------------->*/