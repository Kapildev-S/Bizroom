// This file must be in the public directory

// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAlJYElsOYVcjoWGZOYug7mkoKXYWYMaIY",
  authDomain: "bill-7362b.firebaseapp.com",
  projectId: "bill-7362b",
  storageBucket: "bill-7362b.appspot.com",
  messagingSenderId: "374803975236",
  appId: "1:374803975236:web:be4e0a4caa45ad01e34011",
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/favicon.ico",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
