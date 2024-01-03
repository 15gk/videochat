let APP_ID = "671a71dae79c4bc0b07f52ab1879a127";

let token = null;
let uid = String(Math.floor(Math.random() * 10000));

let client;
let channel;





let video;
let handPoseNet;
let pose = [];
let predictions = [];
let nn;
let currentState = "waiting";
let targetLabel = null;

let collectingData = false;

let poseLabel = "";

// number of hand features detected = 21

function isvalidKey(pressedKey) {
  if (pressedKey.toLowerCase() >= "a" && pressedKey.toLowerCase() <= "z")
    return true;

  return false;
}

function displayResult(result) {
  console.log("displayResult");
  const gestureMapping = {
    A: "Hello",
    B: "Power",
    C: "ok",
    D: "Peace",
    E: "Thumps up",
    F: "Thump down",
    G: "I love you",
    H: "rock",
    I: "call me",
    J: "Bang bang",
  };
  // console.log(result[0].label);
  console.log(result);
  let jsonString = JSON.stringify(result);
  let jsonObject = JSON.parse(jsonString);
  console.log(jsonString);
  console.log(jsonObject[0].label);

  const r = document.getElementById("r");
  const confidence = document.getElementById("confidence");
  // Get the gesture corresponding to the label
  const gesture = gestureMapping[jsonObject[0].label];

  r.innerHTML = gesture || jsonObject[0].label;

  // res.innerHTML = result[0].label;
  // let score = (jsonObject[0].confidence * 100).toFixed(2);

  // // let confidenceStr = score.toString() + " %";
  // confidence.innerHTML = confidenceStr;
}

// check for key presses
function keyPressed() {
  // targetLabel = key;
  pressedKey = key;
  targetLabel = isvalidKey(pressedKey) ? pressedKey : null;
  // save collected data if 's' is pressed
  if (targetLabel === "s" || targetLabel === "S") {
    nn.saveData();
  } else if (targetLabel) {
    console.log("Collecting");
    console.log(targetLabel);
    currentState = "collecting";

    // Stop collecting after 5 seconds
    setTimeout(() => {
      console.log("Stopped Collecting");
      currentState = "waiting";
      targetLabel = null;
    }, 10000);
  }
}

function modelLoaded() {
  console.log("Handpose net loaded");
}
function trainModel() {
  // console.log("loading data");
  // console.log(nn.data);
  // nn.loadData("gestures.json", beginTraining());
  // beginTraining();
}

function beginTraining() {
  console.log("Training started");
  nn.normalizeData();
  nn.train({ epochs: 50 }, finishTrain);
}

function finishTrain() {
  console.log("train finished");
  nn.save();
}





let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let roomId = urlParams.get("room");

if (!roomId) {
  window.location = "lobby.html";
}

let localStream;
let remoteStream;
let peerConnection;

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};

let constraints = {
  video: {
    width: { min: 640, ideal: 1920, max: 1920 },
    height: { min: 480, ideal: 1080, max: 1080 },
  },
  audio: true,
};

// let init = async () => {
//   client = await AgoraRTM.createInstance(APP_ID);
//   await client.login({ uid, token });

//   channel = client.createChannel(roomId);
//   await channel.join();

//   channel.on("MemberJoined", handleUserJoined);
//   channel.on("MemberLeft", handleUserLeft);

//   client.on("MessageFromPeer", handleMessageFromPeer);

  
//    video = createCapture(VIDEO);
 
 

//   // localStream = await navigator.mediaDevices.getUserMedia(constraints);

// };
async function setup(){  
     
    // init();
    client = await AgoraRTM.createInstance(APP_ID);
    await client.login({ uid, token });

  channel = client.createChannel(roomId);
    await channel.join();

   channel.on("MemberJoined", handleUserJoined);
   channel.on("MemberLeft", handleUserLeft);

   client.on("MessageFromPeer", handleMessageFromPeer);

  
    video = createCapture(VIDEO);
 
 

  // localStream = await navigator.mediaDevices.getUserMedia(constraints);
   
     handPoseNet = ml5.handpose(video, modelLoaded);
     // handPoseNet.on("predict", gotHandPoses);
     handPoseNet.on("predict", (results) => {
       predictions = results;
       console.log(results);
       gotHandPoses(results);
     });
     console.log("hello");
     video.hide();

     const options = {
       inputs: 21 * 3,
       outputs: 10,
       task: "classification",
       debug: true,
     };

     const modelInfo = {
       model: "model/model.json",
       metadata: "model/model_meta.json",
       weights: "model/model.weights.bin",
     };

     nn = ml5.neuralNetwork(options); // initialize dense neural network
     nn.load(modelInfo, nnLoaded);
     document.getElementById("user-1").srcObject = video;
 
}



function nnLoaded() {
  console.log("Dense Model loaded");
  classifyGesture();
}

function classifyGesture() {
  if (pose.length > 0) {
    let inputs = []; // inputs for neural network

    for (let i = 0; i < pose.length; i++) {
      // Storing feature co-ordinates in 1-D array
      const x = parseFloat(pose[i][0].toFixed(2));
      const y = parseFloat(pose[i][1].toFixed(2));
      const z = parseFloat(pose[i][2].toFixed(2));
      inputs.push(x);
      inputs.push(y);
      inputs.push(z);
    }
    nn.classify(inputs, gotResults);
    // console.log(gotResults)
  } else {
    setTimeout(classifyGesture, 100);
  }
}

function gotResults(err, results) {
  // console.log("label: ", results[0].label);
  // poseLabel = results[0].label;
  // console.log(results)
  displayResult(results);
  classifyGesture();
}

function gotHandPoses(result) {
  if (result.length > 0) {
    pose = result[0].landmarks; // co-ordinates of the features

    if (currentState == "collecting") {
      let inputs = []; // inputs for neural network

      for (let i = 0; i < pose.length; i++) {
        // Storing feature co-ordinates in 1-D array
        const x = parseFloat(pose[i][0].toFixed(2));
        const y = parseFloat(pose[i][1].toFixed(2));
        const z = parseFloat(pose[i][2].toFixed(2));
        inputs.push(x);
        inputs.push(y);
        inputs.push(z);
      }
      let target = [targetLabel];
      nn.addData(inputs, target); // Add the data to neural network raw array
    }
  }
}

function draw() {
  image(video, 0, 0, 600,800);
  drawKeypoints();
  console.log('draw')

  // fill(39, 177, 229);
  // noStroke();
  // textSize(256);
  // textAlign(CENTER, CENTER);
  // text(poseLabel, width / 2, height / 2);
}

// A function to draw ellipses over the detected keypoints
function drawKeypoints() {
  for (let i = 0; i < predictions.length; i += 1) {
    const prediction = predictions[i];
    for (let j = 0; j < prediction.landmarks.length; j += 1) {
      const keypoint = prediction.landmarks[j];
      fill(0, 255, 0);
      noStroke();
      ellipse(keypoint[0], keypoint[1], 10, 10);
    }
  }
}







let handleUserLeft = (MemberId) => {
  document.getElementById("user-2").style.display = "none";
  document.getElementById("user-1").classList.remove("smallFrame");
};

let handleMessageFromPeer = async (message, MemberId) => {
  message = JSON.parse(message.text);

  if (message.type === "offer") {
    createAnswer(MemberId, message.offer);
  }

  if (message.type === "answer") {
    addAnswer(message.answer);
  }

  if (message.type === "candidate") {
    if (peerConnection) {
      peerConnection.addIceCandidate(message.candidate);
    }
  }
};

let handleUserJoined = async (MemberId) => {
  console.log("A new user joined the channel:", MemberId);
  createOffer(MemberId);
};

let createPeerConnection = async (MemberId) => {
  peerConnection = new RTCPeerConnection(servers);

  remoteStream = new MediaStream();
  document.getElementById("user-2").srcObject = remoteStream;
  document.getElementById("user-2").style.display = "block";

  document.getElementById("user-1").classList.add("smallFrame");

  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    document.getElementById("user-1").srcObject = localStream;
  }

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      client.sendMessageToPeer(
        {
          text: JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
          }),
        },
        MemberId
      );
    }
  };
};

let createOffer = async (MemberId) => {
  await createPeerConnection(MemberId);

  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "offer", offer: offer }) },
    MemberId
  );
};

let createAnswer = async (MemberId, offer) => {
  await createPeerConnection(MemberId);

  await peerConnection.setRemoteDescription(offer);

  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "answer", answer: answer }) },
    MemberId
  );
};

let addAnswer = async (answer) => {
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.setRemoteDescription(answer);
  }
};

let leaveChannel = async () => {
  await channel.leave();
  await client.logout();
};

let toggleCamera = async () => {
  let videoTrack = localStream
    .getTracks()
    .find((track) => track.kind === "video");

  if (videoTrack.enabled) {
    videoTrack.enabled = false;
    document.getElementById("camera-btn").style.backgroundColor =
      "rgb(255, 80, 80)";
  } else {
    videoTrack.enabled = true;
    document.getElementById("camera-btn").style.backgroundColor =
      "rgb(179, 102, 249, .9)";
  }
};

let toggleMic = async () => {
  let audioTrack = localStream
    .getTracks()
    .find((track) => track.kind === "audio");

  if (audioTrack.enabled) {
    audioTrack.enabled = false;
    document.getElementById("mic-btn").style.backgroundColor =
      "rgb(255, 80, 80)";
  } else {
    audioTrack.enabled = true;
    document.getElementById("mic-btn").style.backgroundColor =
      "rgb(179, 102, 249, .9)";
  }
};

window.addEventListener("beforeunload", leaveChannel);

document.getElementById("camera-btn").addEventListener("click", toggleCamera);
document.getElementById("mic-btn").addEventListener("click", toggleMic);

