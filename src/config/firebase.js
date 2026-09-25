import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

export const firebaseConfig = {
    apiKey: "AIzaSyBEc1KmTOURFvVkUsGXb1Q_sTwX0tm_z9E",
    authDomain: "monit-kegiatan.firebaseapp.com",
    databaseURL: "https://monit-kegiatan-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "monit-kegiatan",
    storageBucket: "monit-kegiatan.firebasestorage.app",
    messagingSenderId: "778332842690",
    appId: "1:778332842690:web:a723b5200fda1f3391e95b"
};

export const APP_ID = 'monit-kegiatan';

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const db = firebase.database();