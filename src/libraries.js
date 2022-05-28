/*Contains dynamic data for templates*/

const guideHeading=["Frontal view scan","Left view scan","Right view scan","Emotion detection"];

const guideDescription={
    0:["Keep your head straight and look in the forward direction.",
    "Try to focus on the green dot shown at the top of the screen for 5 seconds.",
    "Stay close to the camera to avoid error warnings.",
    "Do not move your head during the scanning procedure."
    ],
    1:["Slightly turn your head in the left direction.",
    "Focus on the green dot shown at the top-left corner of the screen for 5 seconds.",
    "Do not turn your head too much to avoid errors during scan.",
    "Do not move your head during the scanning procedure."
    ],
    2:["Slightly turn your head in the right direction.",
    "Focus on the green dot shown at the top-right corner of the screen for 5 seconds.",
    "Do not turn your head too much to avoid errors during scan.",
    "Do not move your head during the scanning procedure."
    ],
    3:["Choose from any of the given emotions {Happy, Surprised, Angry}.",
    "Now make an expression with your face to record the secret emotion.",
    "Scanning process takes around 5 seconds.",
    "Hold that selected emotion during the entire scanning process."
    ]
}

const guideImage={
    0:"static/images/front.jpeg",
    1:"static/images/left.jpeg",
    2:"static/images/right.jpeg",
    3:"static/images/emotions.jpeg"
}

const labels=["front","left","right","expression"];

module.exports={guideHeading,guideImage,guideDescription,labels};