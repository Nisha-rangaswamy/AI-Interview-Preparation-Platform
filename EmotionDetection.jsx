import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

const EmotionDetection = () => {
  const videoRef = useRef();
  const [emotion, setEmotion] = useState("Detecting...");

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = window.location.origin + "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      startVideo();
    };

    const startVideo = () => {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch((err) => console.error("Camera error:", err));
    };

    const detect = async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) return;

      const detections = await faceapi
        .detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 })
        )
        .withFaceExpressions();

      if (detections.length > 0) {
        const emotions = detections[0].expressions;
        const topEmotion = Object.entries(emotions).sort((a, b) => b[1] - a[1])[0];
        setEmotion(topEmotion[0]);
      } else {
        setEmotion("No face detected");
      }
    };

    loadModels();
    const interval = setInterval(detect, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-2">
      <h2 className="text-lg font-semibold text-blue-600">
        Current Emotion: {emotion}
      </h2>
      <video
        ref={videoRef}
        autoPlay
        muted
        width="300"
        height="220"
        className="rounded-lg shadow"
      />
    </div>
  );
};

export default EmotionDetection;
