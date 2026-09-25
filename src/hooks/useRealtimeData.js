import { useState, useEffect } from 'react';
import { db, APP_ID } from '../config/firebase';

export const useRealtimeData = () => {
  const [tasks, setTasks] = useState([]);
  const [groupedTasks, setGroupedTasks] = useState([]);
  const [votings, setVotings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceEvents, setAttendanceEvents] = useState([]); // <-- STATE ABSENSI REALTIME
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    if (!db) {
      setGlobalError('Database Firebase tidak terhubung');
      setIsLoading(false);
      return;
    }

    try {
      // 1. LISTEN TUGAS / TASKS
      const tasksRef = db.ref(`artifacts/${APP_ID}/public/data/tasks`);
      tasksRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
          const rawData = snapshot.val() || {}; // Proteksi null object
          const taskArray = Object.keys(rawData).map(key => ({ id: key, ...rawData[key] }));
          setTasks(taskArray);

          // Grouping Tugas Berdasarkan Nama Tugas
          const groups = {};
          taskArray.forEach(task => {
            const name = task.taskName || 'Tanpa Nama';
            if (!groups[name]) {
              groups[name] = {
                taskName: name,
                deadline: task.deadline,
                target: task.target || 0,
                progress: 0,
                status: task.status || 'Proses',
                items: [] // Inilah sumber datanya, jadi di card kita padukan items/assignees
              };
            }
            groups[name].items.push(task);
            groups[name].progress += Number(task.progress || 0);
          });
          setGroupedTasks(Object.values(groups));
        } else {
          setTasks([]);
          setGroupedTasks([]);
        }
      });

      // 2. LISTEN VOTING
      const votingsRef = db.ref(`artifacts/${APP_ID}/public/data/votings`);
      votingsRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
          const rawVotings = snapshot.val() || {}; // Proteksi null object
          const votingsArray = Object.keys(rawVotings).map(key => ({ id: key, ...rawVotings[key] }));
          setVotings(votingsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        } else {
          setVotings([]);
        }
      });

      // 3. LISTEN SDM / EMPLOYEES
      const empRef = db.ref(`artifacts/${APP_ID}/public/data/employees`);
      empRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
          const rawEmp = snapshot.val() || {}; // Proteksi null object
          const empArray = Object.keys(rawEmp).map(key => ({ id: key, ...rawEmp[key] }));
          setEmployees(empArray);
        } else {
          setEmployees([]);
        }
      });

      // 4. LISTEN KEGIATAN ABSENSI
      const attendanceRef = db.ref(`artifacts/${APP_ID}/public/data/attendance_events`);
      attendanceRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
          const rawAtt = snapshot.val() || {}; // Proteksi null object
          const attArray = Object.keys(rawAtt).map(key => ({ id: key, ...rawAtt[key] }));
          setAttendanceEvents(attArray.sort((a, b) => b.createdAt?.localeCompare(a.createdAt || '') || 0));
        } else {
          setAttendanceEvents([]);
        }
        setIsLoading(false);
      }, (err) => {
        console.error('Attendance Listen Error:', err);
        setIsLoading(false);
      });

    } catch (err) {
      console.error('Firebase Sync Error:', err);
      setGlobalError('Gagal sinkronisasi data dari server');
      setIsLoading(false);
    }

    // CLEANUP LISTENERS UPON UNMOUNT
    return () => {
      db.ref(`artifacts/${APP_ID}/public/data/tasks`).off();
      db.ref(`artifacts/${APP_ID}/public/data/votings`).off();
      db.ref(`artifacts/${APP_ID}/public/data/employees`).off();
      db.ref(`artifacts/${APP_ID}/public/data/attendance_events`).off();
    };
  }, []);

  return { 
    tasks, 
    groupedTasks, 
    votings, 
    employees, 
    attendanceEvents,
    db, 
    isLoading, 
    globalError 
  };
};
