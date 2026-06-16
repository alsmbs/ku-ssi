import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';
import { 
  Play, CheckCircle, MonitorUp, Smartphone, Settings, AlertCircle, 
  DollarSign, LogOut, BarChart3, Download, Users, TrendingUp, Trophy, 
  ChevronRight, Building2, Presentation, Loader2, Activity, RefreshCw, Trash2, LayoutDashboard,
  UserCheck, ChevronDown, ChevronUp, FileText, Eye, Calculator, PieChart, Clock, Pause, Square, CheckSquare, Edit3, Lock
} from 'lucide-react';

// === [Firebase 초기화] ===
const firebaseConfig = {
  apiKey: "AIzaSyALr4fhyoToh0yseqsKleoU_B07FexO4Wc",
  authDomain: "ku-ssi.firebaseapp.com",
  projectId: "ku-ssi",
  storageBucket: "ku-ssi.firebasestorage.app",
  messagingSenderId: "227981706776",
  appId: "1:227981706776:web:27b2208e26513677bde56d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'ku-ssi-final-v1'; 

// === [발표 순서 및 기본 설정] ===
const PRESENTATION_ORDER = [6, 3, 1, 2, 8, 9, 4, 7, 5];

const DEFAULT_TEAMS = [
  { id: 1, name: '1팀', desc: '팀 소개를 입력하세요', membersStr: '2025140647,구경모\n2025140659,류현서\n2026140613,김도훈\n2026320611,이건호' },
  { id: 2, name: '2팀', desc: '팀 소개를 입력하세요', membersStr: '2026130343,이영종\n2026190135,신효식\n2026320125,김경우' },
  { id: 3, name: '3팀', desc: '팀 소개를 입력하세요', membersStr: '2022130101,조형식\n2025140429,최라윤\n2025140508,정이든샘\n2024320053,강디아나' },
  { id: 4, name: '4팀', desc: '팀 소개를 입력하세요', membersStr: '2025120361,박경환\n2023140654,배병찬\n2026140638,박준하' },
  { id: 5, name: '5팀', desc: '팀 소개를 입력하세요', membersStr: '2025120036,김지우\n2025140228,박찬진\n2025140237,김민찬' },
  { id: 6, name: '6팀', desc: '팀 소개를 입력하세요', membersStr: '2025120316,정유현\n2026170603,양지우\n2026140659,성윤지' },
  { id: 7, name: '7팀', desc: '팀 소개를 입력하세요', membersStr: '2022130127,김주연\n2026240081,이서인\n2023240164,이나가키 사나\n2025320370,박준서' },
  { id: 8, name: '8팀', desc: '팀 소개를 입력하세요', membersStr: '2025120055,이주형\n2026170903,송채훈\n2019170024,이태윤' },
  { id: 9, name: '9팀', desc: '팀 소개를 입력하세요', membersStr: '2025220054,김재원\n2025220057,성주희\n2021250276,배준상' },
];

const ATTRACT_OPTIONS = [
  { id: 'impact', label: '명확하고 시급한 사회 문제 해결' },
  { id: 'innovation', label: '기존 대안 대비 압도적인 차별성 및 혁신성' },
  { id: 'profit', label: '현실적이고 확장 가능한 비즈니스/수익 모델' },
  { id: 'market', label: '타겟 고객의 니즈와 시장 분석의 타당성' },
  { id: 'team', label: '창업 팀의 전문성 및 문제 해결 실행력' },
  { id: 'presentation', label: '발표의 논리력 및 설득력' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [deviceMode, setDeviceMode] = useState('pc'); 
  const [loginId, setLoginId] = useState('');
  const [loginName, setLoginName] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  
  const [globalPhase, setGlobalPhase] = useState(0); 
  const [openedPhases, setOpenedPhases] = useState([]); // 열린 탭 누적
  const [globalEvalStatus, setGlobalEvalStatus] = useState('IN_PROGRESS'); // IN_PROGRESS, PAUSED, ENDED
  const [localPhase, setLocalPhase] = useState(0);
  const [teamsConfig, setTeamsConfig] = useState(DEFAULT_TEAMS);
  
  const [timerSync, setTimerSync] = useState({ isRunning: false, endsAt: 0, remaining: 0, duration: 0 });
  const [timeLeft, setTimeLeft] = useState(0);

  const [adminTab, setAdminTab] = useState('control'); 
  const [submissionsList, setSubmissionsList] = useState([]);
  const [activeUsers, setActiveUsers] = useState({}); 
  const [expandedTeam, setExpandedTeam] = useState(null); 
  const [expandedStudent, setExpandedStudent] = useState(null); 

  const [evaluations, setEvaluations] = useState(
    Array.from({ length: 9 }, (_, i) => ({ 
      teamId: i + 1, problem: 0, solution: 0, scaleup: 0, comment: '', tempAmount: '' 
    }))
  );
  
  const [finalInvestments, setFinalInvestments] = useState({ 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0 });
  const [absoluteFirstTeam, setAbsoluteFirstTeam] = useState(null);
  const [firstTeamReason, setFirstTeamReason] = useState('');
  const [finalAttractiveness, setFinalAttractiveness] = useState(
    ATTRACT_OPTIONS.reduce((acc, opt) => ({ ...acc, [opt.id]: false }), {})
  );
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 커스텀 모달 (경고창 제한 우회)
  const [modal, setModal] = useState({ show: false, type: '', targetId: null, targetName: '', message: '' });

  // === [페이퍼로지 폰트 적용] ===
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @font-face { font-family: 'Paperlogy'; font-weight: 400; src: url('https://fastly.jsdelivr.net/gh/projectnoonnu/2408-3@1.0/Paperlogy-4Regular.woff2') format('woff2'); }
      @font-face { font-family: 'Paperlogy'; font-weight: 700; src: url('https://fastly.jsdelivr.net/gh/projectnoonnu/2408-3@1.0/Paperlogy-7Bold.woff2') format('woff2'); }
      @font-face { font-family: 'Paperlogy'; font-weight: 900; src: url('https://fastly.jsdelivr.net/gh/projectnoonnu/2408-3@1.0/Paperlogy-9Black.woff2') format('woff2'); }
      * { font-family: 'Paperlogy', sans-serif !important; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const studentList = useMemo(() => {
    let list = [];
    teamsConfig.forEach(team => {
      if (!team.membersStr) return;
      const lines = team.membersStr.split('\n').map(l => l.trim()).filter(l => l);
      lines.forEach(line => {
        const [id, name] = line.split(',').map(s => s.trim());
        if (id && name) list.push({ id, name, team: team.id });
      });
    });
    return list;
  }, [teamsConfig]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // === [Firebase Auth] ===
  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (err) {}
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // === [실시간 데이터 구독] ===
  useEffect(() => {
    if (!user) return;
    
    const unsubPhase = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'state'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGlobalPhase(data.phase || 0);
        setOpenedPhases(data.openedPhases || []);
        setGlobalEvalStatus(data.evalStatus || 'IN_PROGRESS');
        if (role === 'student' && data.phase !== globalPhase) setLocalPhase(data.phase);
        if (data.teams) setTeamsConfig(data.teams);
        if (data.timer) setTimerSync(data.timer);
      } else {
        setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'state'), { 
          phase: 0, openedPhases: [0], evalStatus: 'IN_PROGRESS', teams: teamsConfig, timer: timerSync 
        });
      }
    });

    const unsubSubmissions = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'submissions'), (snapshot) => {
      const subs = [];
      snapshot.forEach(doc => subs.push(doc.data()));
      setSubmissionsList(subs);
      
      if (role === 'student' && studentInfo) {
        const hasSubmitted = subs.find(s => s.studentId === studentInfo.studentId);
        setIsSubmitted(!!hasSubmitted);
      }
    });

    const unsubActive = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'active_users'), (snapshot) => {
      const activeData = {};
      snapshot.forEach(doc => { activeData[doc.id] = doc.data(); });
      setActiveUsers(activeData);
    });

    return () => { unsubPhase(); unsubSubmissions(); unsubActive(); };
  }, [user, role, studentInfo, globalPhase]);

  // === [타이머 로직] ===
  useEffect(() => {
    let interval;
    if (timerSync.isRunning) {
      interval = setInterval(() => {
        const remaining = Math.max(0, timerSync.endsAt - Date.now());
        setTimeLeft(remaining);
        if (remaining === 0) clearInterval(interval);
      }, 100);
    } else {
      setTimeLeft(timerSync.remaining || 0);
    }
    return () => clearInterval(interval);
  }, [timerSync]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleTimerControl = async (action, minutes = 0) => {
    let newTimer = { ...timerSync };
    const now = Date.now();
    if (action === 'start') {
      const ms = minutes * 60 * 1000;
      newTimer = { isRunning: true, endsAt: now + ms, remaining: ms, duration: ms };
    } else if (action === 'pause') {
      newTimer = { isRunning: false, endsAt: timerSync.endsAt, remaining: Math.max(0, timerSync.endsAt - now), duration: timerSync.duration };
    } else if (action === 'resume') {
      newTimer = { isRunning: true, endsAt: now + timerSync.remaining, remaining: timerSync.remaining, duration: timerSync.duration };
    } else if (action === 'stop') {
      newTimer = { isRunning: false, endsAt: 0, remaining: 0, duration: 0 };
    }
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'state'), { timer: newTimer }, { merge: true });
  };

  // === [디바운싱 클라우드 자동 저장] ===
  useEffect(() => {
    if (role === 'student' && studentInfo && !isSubmitted) {
      const timeoutId = setTimeout(async () => {
        try {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'active_users', studentInfo.studentId), {
            timestamp: new Date().toISOString(), evaluations, finalInvestments, finalAttractiveness, absoluteFirstTeam, firstTeamReason, 
            currentPhase: localPhase, connected: true
          }, { merge: true });
        } catch(e) {}
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [evaluations, finalInvestments, finalAttractiveness, absoluteFirstTeam, firstTeamReason, role, studentInfo, isSubmitted, localPhase]);

  useEffect(() => {
    if (globalPhase === 10 && localPhase === 10 && role === 'student') {
      setFinalInvestments(prev => {
        const merged = { ...prev };
        let hasData = false;
        Object.values(prev).forEach(v => { if (v > 0) hasData = true; });
        if (!hasData) evaluations.forEach(ev => { merged[ev.teamId] = parseInt(ev.tempAmount) || 0; });
        return merged;
      });
    }
  }, [globalPhase, localPhase, role, evaluations]);

  // === [핸들러] ===
  const handleLogin = async (e) => {
    e.preventDefault();
    if (loginId === 'startup' && loginName === 'ckddjq') { setRole('admin'); return; }
    const student = studentList.find(s => s.id === loginId && s.name === loginName);
    if (student) {
      setStudentInfo({ studentId: student.id, name: student.name, myTeam: student.team });
      setRole('student'); setLocalPhase(globalPhase);
      if (user) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'active_users', student.id), { connected: true, timestamp: new Date().toISOString() }, { merge: true });
    } else showToast('명단에 일치하는 정보가 없습니다. 관리자에게 문의하세요.');
  };

  const changePhase = async (newPhase) => {
    if (!user) return;
    const newOpened = [...new Set([...openedPhases, newPhase])];
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'state'), { 
      phase: newPhase, openedPhases: newOpened 
    }, { merge: true });
    showToast(`Phase ${newPhase} 동기화 완료`);
  };

  const changeEvalStatus = async (status) => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'state'), { 
      evalStatus: status 
    }, { merge: true });
    showToast(`학생 화면이 ${status === 'IN_PROGRESS' ? '입력 가능' : status === 'PAUSED' ? '일시 정지' : '종료'} 상태로 변경되었습니다.`);
  };

  const updateTeamsConfig = async () => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'state'), { teams: teamsConfig }, { merge: true });
    showToast('팀 명부 및 모수 정보가 서버에 적용되었습니다.');
  };

  const handleTeamConfigChange = (teamId, field, value) => {
    setTeamsConfig(prev => prev.map(t => t.id === teamId ? { ...t, [field]: value } : t));
  };

  const handleEvalChange = (teamIndex, field, value) => {
    const newEvals = [...evaluations];
    newEvals[teamIndex] = { ...newEvals[teamIndex], [field]: value };
    setEvaluations(newEvals);
  };

  const handleFinalAttractChange = (optionId) => {
    setFinalAttractiveness(prev => ({ ...prev, [optionId]: !prev[optionId] }));
  };

  const handleFinalInvestChange = (teamId, value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setFinalInvestments(prev => ({ ...prev, [teamId]: numericValue ? parseInt(numericValue, 10) : 0 }));
  };

  const submitFinalEval = async () => {
    if (!user || !studentInfo) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'submissions', studentInfo.studentId), {
        studentId: studentInfo.studentId, name: studentInfo.name, myTeam: studentInfo.myTeam,
        evaluations, finalInvestments, finalAttractiveness, absoluteFirstTeam: derivedFirstTeam, firstTeamReason, timestamp: new Date().toISOString()
      });
      setIsSubmitted(true); showToast('포트폴리오가 성공적으로 제출되었습니다.');
    } catch (error) { showToast("제출 오류 발생"); }
  };

  // === [초기화(리셋) 로직] ===
  const confirmReset = async () => {
    if (modal.type === 'STUDENT') {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'submissions', modal.targetId));
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'active_users', modal.targetId));
        showToast(`${modal.targetName} 학생이 초기화되었습니다.`);
      } catch (e) { showToast("오류가 발생했습니다."); }
    } else if (modal.type === 'ALL') {
      try {
        for (const sub of submissionsList) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'submissions', sub.studentId));
        }
        for (const [sId, _] of Object.entries(activeUsers)) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'active_users', sId));
        }
        // 상태 초기화
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'state'), { 
          phase: 0, openedPhases: [0], evalStatus: 'IN_PROGRESS', teams: teamsConfig, timer: { isRunning: false, endsAt: 0, remaining: 0, duration: 0 } 
        });
        showToast('모든 평가 데이터가 초기화되었습니다.');
      } catch (e) { showToast("오류가 발생했습니다."); }
    }
    setModal({ show: false, type: '', targetId: null, targetName: '', message: '' });
  };

  // === [환산 점수 재계산] ===
  const getInvestmentDetails = () => {
    const details = { 1:{total:0, count:0, investors:[]}, 2:{total:0, count:0, investors:[]}, 3:{total:0, count:0, investors:[]}, 4:{total:0, count:0, investors:[]}, 5:{total:0, count:0, investors:[]}, 6:{total:0, count:0, investors:[]}, 7:{total:0, count:0, investors:[]}, 8:{total:0, count:0, investors:[]}, 9:{total:0, count:0, investors:[]} };
    submissionsList.forEach(sub => {
      Object.entries(sub.finalInvestments).forEach(([team, amt]) => {
        if (amt > 0) { details[team].total += amt; details[team].count += 1; details[team].investors.push({ name: sub.name, team: sub.myTeam, amt }); }
      });
    });

    const totalStudents = studentList.length;
    return Object.entries(details).map(([teamIdStr, data]) => {
      const teamId = parseInt(teamIdStr, 10);
      const teamInfo = teamsConfig.find(t => t.id === teamId);
      const memberCount = teamInfo && teamInfo.membersStr ? teamInfo.membersStr.split('\n').filter(l=>l.trim()).length : 0;
      const validVoters = Math.max(1, totalStudents - memberCount); 
      const adjustedScore = data.total / validVoters; 
      return { team: teamIdStr, ...data, teamName: teamInfo?.name||'', memberCount, validVoters, adjustedScore };
    }).sort((a,b) => b.adjustedScore - a.adjustedScore); 
  };
  const investmentDetails = getInvestmentDetails();
  const maxAdjustedScore = investmentDetails.length > 0 ? investmentDetails[0].adjustedScore || 1 : 1;

  // === [엑셀 다운로드] ===
  const downloadFinalExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF팀명(번호),총유치금액,모수제외유효투표자,1인당환산점수(결과)\n";
    investmentDetails.forEach(item => { csvContent += `${item.teamName}(${item.team}팀),${item.total},${item.validVoters},${item.adjustedScore.toFixed(4)}\n`; });
    csvContent += "\n\n제출일시,학번,이름,소속팀,총투자액(본인),최종1위팀,1위선정사유,1위팀_선택매력포인트,";
    for (let i=1; i<=9; i++) csvContent += `${i}팀투자,`;
    for (let i=1; i<=9; i++) csvContent += `${i}팀_P,${i}팀_S,${i}팀_Scale,${i}팀_코멘트,`;
    csvContent += "\n";
    submissionsList.forEach(sub => {
      const total = Object.values(sub.finalInvestments).reduce((a,b)=>a+b, 0);
      const attracts = ATTRACT_OPTIONS.filter(opt => sub.finalAttractiveness?.[opt.id]).map(opt => opt.label.split(' ')[0]).join('|');
      let row = `"${new Date(sub.timestamp).toLocaleString()}","${sub.studentId}","${sub.name}",${sub.myTeam},${total},${sub.absoluteFirstTeam||''},"${(sub.firstTeamReason||'').replace(/"/g, '""').replace(/\n/g, ' ')}","${attracts}",`;
      for (let i=1; i<=9; i++) row += `${sub.finalInvestments[i] || 0},`;
      sub.evaluations.forEach(ev => { 
        row += `${ev.problem||0},${ev.solution||0},${ev.scaleup||0},"${(ev.comment||'').replace(/"/g, '""').replace(/\n/g, ' ')}",`; 
      });
      csvContent += row + "\n";
    });
    const link = document.createElement("a"); link.href = encodeURI(csvContent); link.download = `KU_IR_최종결과.csv`; link.click();
  };

  const downloadMonitoringExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF상태,학번,이름,소속팀,최근활동,임시선택1위팀,1위선정사유,1위팀_선택매력포인트,";
    for (let i=1; i<=9; i++) csvContent += `${i}팀_임시금액,${i}팀_P,${i}팀_S,${i}팀_Scale,${i}팀_초안코멘트,`;
    csvContent += "\n";
    studentList.forEach(s => {
      const isSub = submissionsList.find(sub => sub.studentId === s.id);
      const isActive = activeUsers[s.id];
      const studentData = isSub ? isSub.evaluations : (isActive?.evaluations || []);
      const finalAttr = isSub ? isSub.finalAttractiveness : (isActive?.finalAttractiveness || {});
      const firstTeam = isSub ? isSub.absoluteFirstTeam : (isActive?.absoluteFirstTeam || '');
      const reason = isSub ? isSub.firstTeamReason : (isActive?.firstTeamReason || '');
      const status = isSub ? '제출완료' : isActive ? '작성중' : '미접속';
      const time = isActive?.timestamp ? new Date(isActive.timestamp).toLocaleTimeString() : '';
      const attracts = ATTRACT_OPTIONS.filter(opt => finalAttr[opt.id]).map(opt => opt.label.split(' ')[0]).join('|');
      
      let row = `${status},"${s.id}","${s.name}",${s.team},"${time}",${firstTeam},"${(reason||'').replace(/"/g, '""').replace(/\n/g, ' ')}","${attracts}",`;
      for(let i=1; i<=9; i++) {
        const ev = studentData.find(e => e.teamId === i) || {};
        row += `${ev.tempAmount||0},${ev.problem||0},${ev.solution||0},${ev.scaleup||0},"${(ev.comment||'').replace(/"/g, '""').replace(/\n/g, ' ')}",`;
      }
      csvContent += row + "\n";
    });
    const link = document.createElement("a"); link.href = encodeURI(csvContent); link.download = `KU_IR_모니터링초안.csv`; link.click();
  };

  // === [유효성 검증 및 파생 변수] ===
  const TOTAL_BUDGET = 100;
  const currentTotalTemp = evaluations.reduce((sum, ev) => sum + (parseInt(ev.tempAmount) || 0), 0);
  const finalTotal = Object.values(finalInvestments).reduce((a, b) => a + b, 0);
  const maxInvestment = Math.max(...Object.values(finalInvestments));
  
  const topTeams = Object.keys(finalInvestments).map(Number).filter(team => finalInvestments[team] === maxInvestment && maxInvestment > 0);
  const derivedFirstTeam = topTeams.length === 1 ? topTeams[0] : (topTeams.includes(absoluteFirstTeam) ? absoluteFirstTeam : null);
  const topTeamsText = topTeams.length > 0 ? topTeams.map(t => `${t}팀`).join(', ') : '최고 투자 팀';

  const isFinalValid = finalTotal === TOTAL_BUDGET && 
    Object.values(finalInvestments).filter(v => v > 0).length >= 2 && 
    Object.values(finalInvestments).every(v => v <= 50) && 
    (studentInfo?.myTeam ? finalInvestments[studentInfo.myTeam] === 0 : true) &&
    derivedFirstTeam !== null && 
    firstTeamReason.trim().length > 0;

  const totalCount = studentList.length;
  const submittedCount = submissionsList.length;
  let activeCount = 0;
  studentList.forEach(s => {
    const isSub = submissionsList.find(sub => sub.studentId === s.id);
    const isActive = activeUsers[s.id];
    if (!isSub && isActive?.timestamp && (Date.now() - new Date(isActive.timestamp).getTime() < 30 * 60 * 1000)) {
      activeCount++;
    }
  });
  const waitingCount = totalCount - submittedCount - activeCount;

  return (
    <div className="min-h-screen bg-[#F4F4F4] text-gray-800 pb-10">
      
      {/* 글로벌 헤더 */}
      <div className="bg-[#8A1538] text-white p-3 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2 px-4">
          <Building2 className="w-6 h-6 text-[#B4975A]" />
          <span className="font-black tracking-wider text-sm md:text-lg">스타트업 소셜 이노베이션 <span className="font-light">IR 발표</span></span>
        </div>
        <div className="flex items-center space-x-2 bg-black/20 p-1 rounded-lg">
          <button onClick={() => setDeviceMode('pc')} className={`p-2 rounded flex items-center transition ${deviceMode === 'pc' ? 'bg-white text-[#8A1538]' : 'text-gray-300'}`}><MonitorUp className="w-4 h-4" /><span className="hidden md:inline ml-2 text-xs font-bold">PC</span></button>
          <button onClick={() => setDeviceMode('mobile')} className={`p-2 rounded flex items-center transition ${deviceMode === 'mobile' ? 'bg-white text-[#8A1538]' : 'text-gray-300'}`}><Smartphone className="w-4 h-4" /><span className="hidden md:inline ml-2 text-xs font-bold">Mobile</span></button>
        </div>
      </div>

      {/* 모달 팝업 */}
      {modal.show && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-[slideDown_0.2s_ease-out]">
            <div className="flex items-center text-red-600 mb-4">
              <AlertCircle className="w-8 h-8 mr-2"/>
              <h3 className="text-xl font-black">데이터 초기화 경고</h3>
            </div>
            <p className="text-gray-600 font-bold mb-6">{modal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setModal({show: false})} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">취소</button>
              <button onClick={confirmReset} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md">네, 초기화합니다</button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[90] animate-[slideDown_0.3s_ease-out]">
          <div className="bg-gray-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center font-bold text-sm"><CheckCircle className="w-4 h-4 mr-2 text-green-400" />{toastMessage}</div>
        </div>
      )}

      <div className="pt-8 px-4 flex justify-center relative">
        <div className={deviceMode === 'pc' ? "max-w-7xl w-full mx-auto shadow-2xl rounded-xl overflow-hidden min-h-[85vh] flex flex-col bg-white relative" : "max-w-md w-full mx-auto shadow-2xl border-x min-h-screen flex flex-col bg-gray-50 relative"}>

          {/* === 1. 로그인 === */}
          {!role && (
            <div className="flex-1 flex flex-col p-8 items-center justify-center bg-white">
              <div className="w-20 h-20 bg-[#8A1538] rounded-2xl flex items-center justify-center shadow-lg mb-6"><Presentation className="w-10 h-10 text-white" /></div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">기말 IR 발표심사</h1>
              <p className="text-gray-500 mb-8 font-medium">스타트업 소셜 이노베이션(엔젤투자 시뮬레이션)</p>
              <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} required className="w-full p-4 rounded-xl border focus:ring-2 focus:ring-[#8A1538] outline-none" placeholder="학번" />
                <input type="text" value={loginName} onChange={e => setLoginName(e.target.value)} required className="w-full p-4 rounded-xl border focus:ring-2 focus:ring-[#8A1538] outline-none" placeholder="이름" />
                <button type="submit" className="w-full bg-[#8A1538] text-white font-bold py-4 rounded-xl shadow-md flex justify-center items-center hover:bg-[#6e112d]">심사장 입장 <ChevronRight className="w-5 h-5 ml-1" /></button>
              </form>
            </div>
          )}

          {/* === 2. 교수자 대시보드 === */}
          {role === 'admin' && (
            <div className="flex-1 flex flex-col h-full bg-slate-50">
              <div className="bg-white border-b border-gray-200 px-6 flex justify-between items-center sticky top-0 z-10 shadow-sm overflow-x-auto">
                <div className="flex space-x-1 min-w-max">
                  <button onClick={() => setAdminTab('control')} className={`py-4 px-6 font-bold text-sm border-b-2 transition ${adminTab === 'control' ? 'border-[#8A1538] text-[#8A1538]' : 'border-transparent text-gray-500'}`}><Play className="w-4 h-4 inline mr-2"/> 진행 제어</button>
                  <button onClick={() => setAdminTab('settings')} className={`py-4 px-6 font-bold text-sm border-b-2 transition ${adminTab === 'settings' ? 'border-[#8A1538] text-[#8A1538]' : 'border-transparent text-gray-500'}`}><Settings className="w-4 h-4 inline mr-2"/> 팀 설정</button>
                  <button onClick={() => setAdminTab('monitoring')} className={`py-4 px-6 font-bold text-sm border-b-2 transition ${adminTab === 'monitoring' ? 'border-[#8A1538] text-[#8A1538]' : 'border-transparent text-gray-500'}`}><LayoutDashboard className="w-4 h-4 inline mr-2"/> 관제 대시보드</button>
                  <button onClick={() => setAdminTab('investments')} className={`py-4 px-6 font-bold text-sm border-b-2 transition ${adminTab === 'investments' ? 'border-[#8A1538] text-[#8A1538]' : 'border-transparent text-gray-500'}`}><TrendingUp className="w-4 h-4 inline mr-2"/> 최종 현황판</button>
                </div>
                <button onClick={() => setRole(null)} className="text-gray-400 font-bold ml-4 hover:text-red-500"><LogOut className="w-4 h-4"/></button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {/* 탭 1: 컨트롤 */}
                {adminTab === 'control' && (
                  <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 평가 상태 제어 및 타이머 */}
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xl font-black flex items-center"><Lock className="w-6 h-6 mr-2 text-red-600"/> 전체 평가 상태 제어</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded">발표 도중이나 종료 시 학생들의 기기 입력을 즉시 잠금/해제할 수 있습니다.</p>
                        <div className="grid grid-cols-3 gap-2">
                          <button onClick={() => changeEvalStatus('IN_PROGRESS')} className={`py-3 rounded-xl font-bold flex flex-col items-center justify-center border transition-all ${globalEvalStatus === 'IN_PROGRESS' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}>
                            <Play className="w-5 h-5 mb-1"/> 평가 시작
                          </button>
                          <button onClick={() => changeEvalStatus('PAUSED')} className={`py-3 rounded-xl font-bold flex flex-col items-center justify-center border transition-all ${globalEvalStatus === 'PAUSED' ? 'bg-yellow-500 text-white shadow-md' : 'bg-white text-yellow-600 border-yellow-300 hover:bg-yellow-50'}`}>
                            <Pause className="w-5 h-5 mb-1"/> 일시 정지
                          </button>
                          <button onClick={() => changeEvalStatus('ENDED')} className={`py-3 rounded-xl font-bold flex flex-col items-center justify-center border transition-all ${globalEvalStatus === 'ENDED' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-red-600 border-red-300 hover:bg-red-50'}`}>
                            <Square className="w-5 h-5 mb-1"/> 평가 종료
                          </button>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="text-xl font-black mb-4 flex items-center"><Clock className="w-6 h-6 mr-2 text-blue-600"/> 라이브 타이머</h3>
                        <div className="text-center bg-gray-900 text-white p-5 rounded-2xl shadow-inner mb-4">
                          <div className="text-5xl font-mono font-black tabular-nums tracking-wider">{formatTime(timeLeft)}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <button onClick={() => handleTimerControl('start', 15)} className="bg-blue-50 text-blue-700 py-2 rounded-lg font-bold border border-blue-200 hover:bg-blue-100">15분 (전체)</button>
                          <button onClick={() => handleTimerControl('start', 10)} className="bg-blue-50 text-blue-700 py-2 rounded-lg font-bold border border-blue-200 hover:bg-blue-100">10분 (발표)</button>
                          <button onClick={() => handleTimerControl('start', 3)} className="bg-blue-50 text-blue-700 py-2 rounded-lg font-bold border border-blue-200 hover:bg-blue-100">3분 (Q&A)</button>
                        </div>
                        <div className="flex gap-2">
                          {timerSync.isRunning ? 
                            <button onClick={() => handleTimerControl('pause')} className="flex-1 bg-yellow-500 text-white py-3 rounded-xl font-bold flex justify-center items-center"><Pause className="w-5 h-5 mr-1"/> 일시정지</button>
                            : 
                            <button onClick={() => handleTimerControl('resume')} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold flex justify-center items-center"><Play className="w-5 h-5 mr-1"/> 이어서 시작</button>
                          }
                          <button onClick={() => handleTimerControl('stop')} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold flex justify-center items-center"><Square className="w-5 h-5 mr-1"/> 정지/초기화</button>
                        </div>
                      </div>
                    </div>

                    {/* 학생 화면 제어 (발표 순서 적용됨) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-black flex items-center"><MonitorUp className="w-6 h-6 mr-2 text-[#8A1538]"/> 학생 화면 이동 제어</h3>
                      </div>
                      <p className="text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded">아래 버튼을 누르면 모든 학생의 화면이 해당 팀으로 즉시 동기화되며 탭이 오픈됩니다. (실제 발표 순서대로 배치됨)</p>
                      
                      <button onClick={() => changePhase(0)} className={`w-full p-4 mb-5 rounded-xl font-bold flex justify-between border transition-all ${globalPhase === 0 ? 'bg-[#8A1538] text-white border-[#8A1538] shadow-md' : 'bg-gray-50'}`}>[Phase 0] 대기실 (안내화면) {globalPhase === 0 && <span className="flex w-3 h-3 bg-red-400 rounded-full animate-pulse"></span>}</button>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                        {PRESENTATION_ORDER.map(n => {
                          const teamName = teamsConfig.find(t => t.id === n)?.name || `${n}팀`;
                          return (
                            <button key={n} onClick={() => changePhase(n)} className={`p-4 rounded-xl font-bold border transition-all ${globalPhase === n ? 'bg-[#8A1538] text-white border-[#8A1538] shadow-md scale-105' : 'bg-gray-50 hover:bg-gray-100'}`}>
                              <div className="flex flex-col items-center">
                                <Play className={`w-4 h-4 mb-1 ${globalPhase === n ? 'text-[#B4975A]' : 'text-gray-400'}`} /> 
                                <span className="text-sm">{n}팀</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      <button onClick={() => changePhase(10)} className={`w-full p-6 rounded-xl font-black text-xl border shadow-sm transition-all ${globalPhase === 10 ? 'bg-[#B4975A] text-white border-[#B4975A] shadow-md' : 'bg-yellow-50 text-yellow-800'}`}>[Phase 10] 최종 투자 배분 오픈</button>
                    </div>
                  </div>
                )}

                {/* 탭 2: 설정 */}
                {adminTab === 'settings' && (
                  <div className="max-w-6xl mx-auto">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                      <div className="flex justify-between items-end mb-6">
                        <div>
                          <h3 className="text-xl font-black flex items-center"><Users className="w-6 h-6 mr-2 text-[#8A1538]"/> 9팀 명부 및 모수 설정</h3>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                        {teamsConfig.map(team => {
                          const lines = team.membersStr ? team.membersStr.split('\n').filter(l=>l.trim()).length : 0;
                          return (
                            <div key={team.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 hover:shadow-md transition">
                              <div className="flex justify-between items-center mb-3">
                                <span className="font-black text-lg text-[#8A1538]">{team.id}팀</span>
                                <span className="text-xs font-bold bg-white border px-2 py-1 rounded-full text-gray-500">모수: {lines}명</span>
                              </div>
                              <input type="text" value={team.name} onChange={(e) => handleTeamConfigChange(team.id, 'name', e.target.value)} placeholder="팀명" className="w-full p-2.5 mb-2 border rounded-lg text-sm font-bold bg-white focus:ring-1 focus:ring-[#8A1538] outline-none" />
                              <input type="text" value={team.desc} onChange={(e) => handleTeamConfigChange(team.id, 'desc', e.target.value)} placeholder="팀 한 줄 소개" className="w-full p-2 mb-4 border rounded-lg text-xs text-gray-600 bg-white focus:ring-1 focus:ring-[#8A1538] outline-none" />
                              <label className="text-xs font-bold text-gray-500 mb-1 block">팀원 명단 (학번, 이름)</label>
                              <textarea 
                                value={team.membersStr} onChange={(e) => handleTeamConfigChange(team.id, 'membersStr', e.target.value)} 
                                className="w-full h-32 p-3 border rounded-lg text-xs font-mono bg-white focus:ring-1 focus:ring-[#8A1538] outline-none resize-none leading-relaxed" 
                                placeholder="20260001,홍길동"
                              />
                            </div>
                          )
                        })}
                      </div>
                      <button onClick={updateTeamsConfig} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black shadow-lg">모든 설정 서버에 저장하기</button>
                    </div>
                  </div>
                )}

                {/* 탭 3: 모니터링 대시보드 */}
                {adminTab === 'monitoring' && (
                  <div className="max-w-7xl mx-auto">
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-gray-500 text-sm font-bold mb-1">전체 수강생</p>
                          <h3 className="text-2xl font-black text-gray-800">{totalCount}명</h3>
                        </div>
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center"><Users className="w-6 h-6 text-gray-600" /></div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-gray-500 text-sm font-bold mb-1">최종 제출 완료</p>
                          <h3 className="text-2xl font-black text-green-600">{submittedCount}명</h3>
                        </div>
                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center"><CheckCircle className="w-6 h-6 text-green-500" /></div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-gray-500 text-sm font-bold mb-1">현재 접속 (평가중)</p>
                          <h3 className="text-2xl font-black text-blue-600">{activeCount}명</h3>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center"><Activity className="w-6 h-6 text-blue-500" /></div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-gray-500 text-sm font-bold mb-1">미접속 / 대기중</p>
                          <h3 className="text-2xl font-black text-orange-500">{waitingCount}명</h3>
                        </div>
                        <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center"><Pause className="w-6 h-6 text-orange-500" /></div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="text-lg font-bold flex items-center"><Eye className="w-5 h-5 mr-2 text-blue-600"/> 학생별 활동 내역 (X-Ray)</h3>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setModal({show: true, type: 'ALL', targetId: null, targetName: '', message: '테스트용으로 입력된 모든 학생의 제출 데이터를 완전히 삭제하고 초기화하시겠습니까?'})} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-bold flex items-center text-sm border border-red-200">
                            <Trash2 className="w-4 h-4 mr-1"/> 전체 데이터 초기화
                          </button>
                          <button onClick={downloadMonitoringExcel} className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg font-bold flex items-center text-sm border border-blue-200">
                            <Download className="w-4 h-4 mr-1"/> 상태 엑셀 다운로드
                          </button>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-100 text-gray-600 font-bold">
                            <tr>
                              <th className="p-3">상태</th>
                              <th className="p-3">학번/이름 (팀)</th>
                              <th className="p-3">현재 화면위치</th>
                              <th className="p-3">최근 저장 시간</th>
                              <th className="p-3 text-center">개별 리셋</th>
                              <th className="p-3 text-right">답안 보기</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {studentList.map(s => {
                              const isSub = submissionsList.find(sub => sub.studentId === s.id);
                              const isActive = activeUsers[s.id];
                              const studentData = isSub ? isSub.evaluations : (isActive?.evaluations || []);
                              const finalAttr = isSub ? isSub.finalAttractiveness : (isActive?.finalAttractiveness || {});
                              const timeStr = isSub ? new Date(isSub.timestamp).toLocaleTimeString() : (isActive?.timestamp ? new Date(isActive.timestamp).toLocaleTimeString() : '-');
                              const cPhase = isActive?.currentPhase;
                              const phaseText = cPhase === 0 ? '대기실' : (cPhase === 10 ? '최종배분중' : (cPhase ? `${cPhase}팀 평가중` : '-'));
                              
                              let statusUI = <span className="bg-gray-100 text-gray-400 px-2 py-1 rounded text-xs font-bold">미접속</span>;
                              if (isSub) statusUI = <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200">제출완료</span>;
                              else if (isActive) statusUI = <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200 animate-pulse">평가중</span>;

                              return (
                                <React.Fragment key={s.id}>
                                  <tr className="hover:bg-gray-50 transition cursor-pointer">
                                    <td className="p-3" onClick={() => setExpandedStudent(expandedStudent === s.id ? null : s.id)}>{statusUI}</td>
                                    <td className="p-3 font-bold" onClick={() => setExpandedStudent(expandedStudent === s.id ? null : s.id)}>
                                      <span className="font-mono text-gray-400 font-normal mr-2">{s.id}</span>
                                      {s.name} <span className="text-xs text-[#8A1538] bg-[#8A1538]/10 px-1 rounded ml-1">{s.team}팀</span>
                                    </td>
                                    <td className="p-3 font-bold text-gray-600" onClick={() => setExpandedStudent(expandedStudent === s.id ? null : s.id)}>
                                      {isSub ? '-' : phaseText}
                                    </td>
                                    <td className="p-3 text-xs text-gray-500 font-mono" onClick={() => setExpandedStudent(expandedStudent === s.id ? null : s.id)}>{timeStr}</td>
                                    <td className="p-3 text-center">
                                      <button onClick={(e) => { e.stopPropagation(); setModal({show: true, type: 'STUDENT', targetId: s.id, targetName: s.name, message: `${s.name} 학생의 작성 내용을 완전히 삭제하고 재입력 가능하게 초기화하시겠습니까?`})}} className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition">
                                        <RefreshCw className="w-4 h-4"/>
                                      </button>
                                    </td>
                                    <td className="p-3 text-right">
                                      <button onClick={() => setExpandedStudent(expandedStudent === s.id ? null : s.id)} className="text-blue-600 font-bold text-xs bg-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-200 transition">
                                        {expandedStudent === s.id ? '닫기' : '엿보기'}
                                      </button>
                                    </td>
                                  </tr>
                                  {expandedStudent === s.id && (
                                    <tr>
                                      <td colSpan="6" className="p-0 border-b-2 border-blue-200">
                                        <div className="bg-gray-800 p-6 shadow-inner">
                                          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                                            {studentData.map(ev => {
                                              return (
                                                <div key={ev.teamId} className={`bg-gray-700 p-3 rounded-lg border ${s.team === ev.teamId ? 'border-gray-600 opacity-50' : 'border-gray-500'}`}>
                                                  <div className="flex justify-between items-center mb-2"><span className="text-white font-bold">{ev.teamId}팀</span><span className="text-green-400 text-xs font-bold">{ev.tempAmount || 0}만</span></div>
                                                  {s.team !== ev.teamId && (
                                                    <>
                                                      <div className="flex gap-1 mb-2 text-[10px] text-gray-200 font-mono">
                                                        <span className="bg-gray-600 px-1 py-0.5 rounded">P:{ev.problem||0}</span>
                                                        <span className="bg-gray-600 px-1 py-0.5 rounded">S:{ev.solution||0}</span>
                                                        <span className="bg-gray-600 px-1 py-0.5 rounded">Sc:{ev.scaleup||0}</span>
                                                      </div>
                                                      <p className="text-xs text-gray-300 italic h-12 overflow-y-auto bg-gray-800 p-2 rounded">"{ev.comment}"</p>
                                                    </>
                                                  )}
                                                </div>
                                              )
                                            })}
                                          </div>
                                          <div className="bg-gray-700 p-3 rounded-lg border border-gray-500 flex items-center">
                                            <span className="text-white font-bold text-sm mr-3">1위 팀 매력 포인트 (Phase 10) : </span>
                                            <div className="flex gap-2">
                                              {ATTRACT_OPTIONS.filter(opt => studentAttract[opt.id]).map(opt => (
                                                <span key={opt.id} className="text-xs bg-[#8A1538] text-white px-2 py-1 rounded font-bold">{opt.label.split(' ')[0]}</span>
                                              ))}
                                              {ATTRACT_OPTIONS.filter(opt => studentAttract[opt.id]).length === 0 && <span className="text-xs text-gray-400 italic">아직 선택하지 않음</span>}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 탭 4: 현황판 */}
                {adminTab === 'investments' && (
                  <div className="max-w-5xl mx-auto space-y-6">
                    <div className="bg-white p-6 rounded-2xl flex justify-between items-center shadow-sm border">
                      <div>
                        <h3 className="text-xl font-black flex items-center"><Calculator className="w-6 h-6 mr-2 text-[#8A1538]"/> 1인당 환산 점수 랭킹</h3>
                      </div>
                      <button onClick={downloadFinalExcel} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold flex shadow-md hover:bg-black"><Download className="w-4 h-4 mr-2"/> 최종 평가 다운로드</button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {investmentDetails.map((item, idx) => (
                        <div key={item.team} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                          <div className="p-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => setExpandedTeam(expandedTeam === item.team ? null : item.team)}>
                            <div className="flex items-center md:w-1/4 mb-3 md:mb-0">
                              {idx === 0 && <Trophy className="w-6 h-6 mr-2 text-yellow-500" />}
                              <span className="text-xl font-black">{item.team}팀 <span className="text-sm text-gray-500 ml-1">{item.teamName}</span></span>
                            </div>
                            <div className="flex-1 md:px-6 mb-3 md:mb-0">
                              <div className="w-full bg-gray-100 rounded-full h-4 border overflow-hidden"><div className="bg-gradient-to-r from-[#8A1538] to-[#B4975A] h-full transition-all duration-1000" style={{ width: `${(item.adjustedScore / maxAdjustedScore) * 100}%` }}></div></div>
                            </div>
                            <div className="md:w-1/3 flex justify-end items-center text-right">
                              <div className="mr-4">
                                <div className="text-xs text-gray-500 font-bold mb-1 bg-gray-100 px-2 py-0.5 rounded">
                                  {item.total.toLocaleString()}만 / {item.validVoters}명 투표권
                                </div>
                                <div className="text-2xl font-black text-[#8A1538]">
                                  {item.adjustedScore.toFixed(2)}<span className="text-sm font-normal text-gray-500 ml-1">점</span>
                                </div>
                              </div>
                              {expandedTeam === item.team ? <ChevronUp className="w-5 h-5 text-gray-400"/> : <ChevronDown className="w-5 h-5 text-gray-400"/>}
                            </div>
                          </div>
                          
                          {expandedTeam === item.team && (
                            <div className="bg-gray-50 p-6 border-t border-dashed">
                              <h4 className="text-sm font-bold text-gray-500 mb-3 flex items-center"><Users className="w-4 h-4 mr-2"/> 투자자 상세 내역 ({item.count}명 참여)</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {item.investors.map((inv, i) => (<div key={i} className="bg-white p-3 rounded-lg border flex justify-between shadow-sm"><span className="font-bold text-sm">{inv.name} <span className="text-xs text-gray-400">({inv.team})</span></span><span className="font-black text-[#B4975A]">{inv.amt}만</span></div>))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === 3. 학생(Student) 화면 === */}
          {role === 'student' && (
            <div className="flex-1 flex flex-col relative bg-white overflow-hidden">
              
              {/* 글로벌 평가 제어 (일시정지 / 종료) 오버레이 */}
              {globalEvalStatus === 'PAUSED' && (
                <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center animate-[slideDown_0.3s_ease-out]">
                  <Pause className="w-20 h-20 mb-6 text-yellow-400 animate-pulse" />
                  <h2 className="text-4xl font-black mb-4">평가 일시정지</h2>
                  <p className="text-lg text-gray-300">잠시 입력을 멈추고 교수님의 안내에 집중해 주세요.</p>
                </div>
              )}
              {globalEvalStatus === 'ENDED' && (
                <div className="absolute inset-0 z-50 bg-[#8A1538]/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center animate-[slideDown_0.3s_ease-out]">
                  <Square className="w-20 h-20 mb-6 text-red-200" />
                  <h2 className="text-4xl font-black mb-4">모든 평가 종료</h2>
                  <p className="text-lg text-gray-200">현재 평가 세션이 완전히 종료되었습니다.</p>
                </div>
              )}

              <div className="bg-gray-900 text-white p-4 flex justify-between items-center z-20 shadow-md">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-[#8A1538] rounded-full flex items-center justify-center font-black mr-3 shadow-inner text-lg">{studentInfo.myTeam}</div>
                  <div><div className="text-xs text-gray-400 font-bold uppercase tracking-wider">엔젤 투자자</div><div className="font-bold">{studentInfo.name}</div></div>
                </div>
                {!isSubmitted && (
                  <div className="flex items-center bg-gray-800 border border-gray-700 px-3 py-2 rounded-lg shadow-inner text-xs">
                    <span className="text-gray-400 mr-2 hidden md:inline">누적 임시 투자금:</span>
                    <span className={`font-black text-sm ${currentTotalTemp === 100 ? 'text-green-400' : (currentTotalTemp > 100 ? 'text-red-400' : 'text-[#B4975A]')}`}>{currentTotalTemp}만</span>
                    <span className="text-gray-500 ml-1">/ 100만</span>
                  </div>
                )}
              </div>

              {globalPhase > 0 && !isSubmitted && (
                <div className="bg-white border-b border-gray-200 shadow-sm z-10 sticky top-0 flex overflow-x-auto px-2 py-2 gap-2 hide-scrollbar">
                  {/* 실제 발표 순서 배열을 사용하여 탭 렌더링 */}
                  {PRESENTATION_ORDER.map(num => {
                    // 오픈되지 않은 탭이거나, 최종 배분 단계가 아닐 때 숨김
                    if (!openedPhases.includes(num) && globalPhase !== 10) return null; 
                    return (
                      <button key={num} onClick={() => setLocalPhase(num)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${localPhase === num ? 'bg-[#8A1538] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {num}팀 리뷰
                      </button>
                    )
                  })}
                  {openedPhases.includes(10) && (
                    <button onClick={() => setLocalPhase(10)} className={`px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center ${localPhase === 10 ? 'bg-[#B4975A] text-white shadow-md' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}>
                      포트폴리오 확정
                    </button>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-y-auto pb-36 relative">
                {isSubmitted ? (
                  <div className="p-10 flex flex-col items-center justify-center h-full text-center">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"><CheckCircle className="w-12 h-12 text-green-600" /></div>
                    <h2 className="text-2xl font-black text-gray-800">투자 완료</h2>
                    <p className="text-gray-500 mt-2">엔젤투자 포트폴리오 제출이 완료되었습니다.</p>
                  </div>
                ) : (
                  <>
                    {localPhase === 0 && (
                      <div className="p-8 flex flex-col items-center justify-center h-full text-center mt-12">
                        <Loader2 className="w-12 h-12 text-[#8A1538] animate-spin mb-6" />
                        <h2 className="text-2xl font-black text-gray-800 mb-4">모의 투자 대기 중</h2>
                        <div className="bg-gray-50 p-5 rounded-xl border text-sm text-gray-600 text-left leading-relaxed max-w-sm">
                          <p className="font-bold text-[#8A1538] mb-2">💡 동료 평가 가이드</p>
                          여러분이 <strong>'엔젤 투자자'</strong>가 되어 냉철한 시각으로 타 팀의 가치를 산정합니다.<br/><br/>
                          ✓ 총 100만원 전액 소진 필수<br/>
                          ✓ 본인 팀 투자 불가<br/>
                          ✓ 최소 2개팀 분산 투자 / 한 팀당 최대 50만원<br/><br/>
                          모수 제외 환산 로직이 적용되어 팀원 수의 유불리가 완벽히 통제됩니다. 오직 발표 내용과 사업성만 보고 투자하십시오.
                        </div>
                      </div>
                    )}

                    {localPhase >= 1 && localPhase <= 9 && (() => {
                      const currentTeam = localPhase;
                      const evalData = evaluations[currentTeam - 1];
                      const teamInfo = teamsConfig.find(t => t.id === currentTeam) || { name: '', desc: '' };

                      if (studentInfo.myTeam === currentTeam) return (
                        <div className="p-10 text-center mt-20"><AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4"/><h2 className="text-xl font-bold">본인 팀 (평가 제외)</h2></div>
                      );
                      return (
                        <div className="p-6">
                          <div className="mb-6 border-b border-gray-200 pb-5">
                            <h2 className="text-2xl font-black text-gray-900 flex justify-between items-start">
                              <div>
                                <span className="text-[#8A1538] mr-2">{currentTeam}팀.</span>{teamInfo.name}
                                <p className="text-sm text-gray-500 mt-2 font-medium bg-gray-100 inline-block px-3 py-1.5 rounded-lg border">"{teamInfo.desc}"</p>
                              </div>
                              {globalPhase > currentTeam && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded shrink-0 ml-2">수정 가능</span>}
                            </h2>
                          </div>

                          <div className="mb-8 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                            <label className="font-bold text-gray-800 block mb-5 flex items-center"><Edit3 className="w-5 h-5 mr-2 text-[#8A1538]"/> 1. 세부 항목 평가 (1~5점)</label>
                            
                            <div className="mb-6">
                              <label className="font-bold text-sm mb-1 block text-gray-800">Problem (문제 정의)</label>
                              <p className="text-xs text-gray-500 mb-3 bg-gray-50 p-2 rounded">그들이 정의한 문제가 타겟 고객에게 진짜 고통스러운 문제인가?</p>
                              <div className="flex gap-2">
                                {[1,2,3,4,5].map(s => <button key={s} onClick={() => handleEvalChange(currentTeam-1, 'problem', s)} className={`flex-1 py-2.5 rounded-lg font-bold border transition-all ${evalData.problem === s ? 'bg-[#8A1538] text-white shadow-md' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>{s}</button>)}
                              </div>
                            </div>
                            <div className="mb-6">
                              <label className="font-bold text-sm mb-1 block text-gray-800">Solution (해결책)</label>
                              <p className="text-xs text-gray-500 mb-3 bg-gray-50 p-2 rounded">제시한 해결책이 기존 대안보다 압도적으로 나은가?</p>
                              <div className="flex gap-2">
                                {[1,2,3,4,5].map(s => <button key={s} onClick={() => handleEvalChange(currentTeam-1, 'solution', s)} className={`flex-1 py-2.5 rounded-lg font-bold border transition-all ${evalData.solution === s ? 'bg-[#8A1538] text-white shadow-md' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>{s}</button>)}
                              </div>
                            </div>
                            <div className="mb-2">
                              <label className="font-bold text-sm mb-1 block text-gray-800">Scale-up (성장성)</label>
                              <p className="text-xs text-gray-500 mb-3 bg-gray-50 p-2 rounded">이 사업이 실제로 문제를 해결하고, 시장에서 성장할 수 있는 구조인가?</p>
                              <div className="flex gap-2">
                                {[1,2,3,4,5].map(s => <button key={s} onClick={() => handleEvalChange(currentTeam-1, 'scaleup', s)} className={`flex-1 py-2.5 rounded-lg font-bold border transition-all ${evalData.scaleup === s ? 'bg-[#8A1538] text-white shadow-md' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>{s}</button>)}
                              </div>
                            </div>
                          </div>

                          <div className="mb-8">
                            <label className="font-bold text-gray-800 block mb-2">2. 심사역 한 줄 코멘트</label>
                            <textarea 
                              value={evalData.comment} onChange={e => handleEvalChange(currentTeam - 1, 'comment', e.target.value)} 
                              className="w-full p-4 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-[#8A1538] outline-none h-24 text-sm resize-none" 
                              placeholder="가장 매력적인 포인트나 투자 리스크를 작성해주세요." 
                            />
                          </div>

                          <div className="bg-[#8A1538]/5 p-5 rounded-2xl border border-[#8A1538]/20 focus-within:ring-2 focus-within:ring-[#8A1538] transition-all">
                            <label className="font-black text-[#8A1538] block mb-2 text-sm flex items-center"><DollarSign className="w-4 h-4 mr-1"/>3. 임시 가치 산정 (만원)</label>
                            <div className="flex items-center bg-white rounded-xl overflow-hidden border border-[#8A1538]/30">
                              <input 
                                type="text" inputMode="numeric"
                                value={evalData.tempAmount} onChange={e => handleEvalChange(currentTeam-1, 'tempAmount', e.target.value.replace(/[^0-9]/g, ''))} 
                                className="flex-1 p-4 text-2xl font-black text-right outline-none text-[#8A1538]" 
                                placeholder="0" 
                              />
                              <span className="px-4 font-bold text-[#8A1538] border-l border-[#8A1538]/20 bg-[#8A1538]/5 flex items-center">만원</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Phase 10 최종 배분 */}
                    {localPhase === 10 && (
                      <div className="p-5">
                         <div className="bg-[#B4975A] text-white p-6 rounded-2xl mb-6 shadow-md">
                           <h2 className="text-xl font-black flex items-center"><PieChart className="w-5 h-5 mr-2"/> 최종 포트폴리오 확정</h2>
                           <p className="text-sm mt-1 opacity-90 font-medium">100만 원 한도 / 최대 50만 원 / 최소 2팀 분산</p>
                         </div>

                         <div className="space-y-4 mb-8">
                          {[1,2,3,4,5,6,7,8,9].map(num => {
                            if (studentInfo.myTeam === num) return null;
                            const isOver = finalInvestments[num] > 50;
                            const teamInfo = teamsConfig.find(t => t.id === num) || { name: '' };
                            const prevEval = evaluations[num - 1]; 
                            
                            return (
                              <div key={num} className={`p-5 rounded-2xl border transition-all shadow-sm ${isOver ? 'border-red-400 bg-red-50' : 'bg-white'}`}>
                                <div className="flex justify-between items-center mb-3">
                                  <div>
                                    <div className="flex items-center">
                                      <span className="font-black text-lg text-gray-800">{num}팀</span>
                                      <span className="text-sm text-gray-500 ml-2 font-bold">{teamInfo.name}</span>
                                    </div>
                                    <div className="text-xs font-bold text-gray-500 mt-2 flex flex-col gap-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                      <div className="flex items-center gap-2"><span className="text-gray-600 font-normal">Problem (문제)</span><span className="text-[#8A1538] ml-auto">{prevEval.problem||0}점</span></div>
                                      <div className="flex items-center gap-2"><span className="text-gray-600 font-normal">Solution (해결)</span><span className="text-[#8A1538] ml-auto">{prevEval.solution||0}점</span></div>
                                      <div className="flex items-center gap-2"><span className="text-gray-600 font-normal">Scale-up (성장)</span><span className="text-[#8A1538] ml-auto">{prevEval.scaleup||0}점</span></div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end h-full justify-start mt-1">
                                    <div className="flex items-center">
                                      <input 
                                        type="text" inputMode="numeric"
                                        value={finalInvestments[num] || ''} onChange={(e) => handleFinalInvestChange(num, e.target.value)} 
                                        className={`w-24 p-3 text-right font-black text-xl border rounded-lg outline-none shadow-inner ${isOver ? 'text-red-600 border-red-300 bg-white' : 'focus:ring-2 focus:ring-[#8A1538] border-gray-300 bg-gray-50 focus:bg-white'}`} 
                                        placeholder="0" 
                                      />
                                      <span className="ml-2 text-sm text-gray-600 font-bold">만</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 italic line-clamp-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-2">"{prevEval.comment || '작성된 코멘트가 없습니다.'}"</div>
                              </div>
                            );
                          })}
                         </div>

                         {topTeams.length > 1 && (
                           <div className="bg-yellow-50 border border-yellow-200 p-5 rounded-2xl mb-6 shadow-sm">
                             <label className="font-black text-yellow-800 block mb-3 flex items-center">
                               <AlertCircle className="w-5 h-5 mr-1.5"/> 최고액 투자 팀이 여러 개입니다. 최종 1위 팀을 선택해주세요.
                             </label>
                             <div className="flex gap-2">
                               {topTeams.map(t => (
                                 <button 
                                   key={t} onClick={() => setAbsoluteFirstTeam(t)} 
                                   className={`flex-1 py-3 rounded-xl font-bold border transition-all ${absoluteFirstTeam === t ? 'bg-yellow-500 text-white shadow-md border-yellow-500' : 'bg-white text-yellow-700 border-yellow-300 hover:bg-yellow-100'}`}
                                 >
                                   {t}팀
                                 </button>
                               ))}
                             </div>
                           </div>
                         )}

                         {derivedFirstTeam !== null && maxInvestment > 0 && (
                           <div className="bg-[#8A1538]/5 border border-[#8A1538]/20 p-5 md:p-6 rounded-2xl mb-8 shadow-sm">
                             <h3 className="font-black text-gray-800 text-lg mb-5 border-b border-[#8A1538]/20 pb-3 flex items-center">
                               <Trophy className="w-5 h-5 text-yellow-500 mr-2"/> 최종 1위 <span className="text-[#8A1538] mx-1">{derivedFirstTeam}팀</span> 선정 사유
                             </h3>
                             
                             <label className="font-bold text-gray-800 block mb-3 flex flex-col md:flex-row md:items-center">
                               <span className="flex items-center"><CheckSquare className="w-4 h-4 mr-1.5 text-[#8A1538]"/> 투자 매력 포인트</span>
                               <span className="text-xs font-normal text-gray-500 md:ml-2 mt-1 md:mt-0">(선택 사항, 다중 선택 가능)</span>
                             </label>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
                               {ATTRACT_OPTIONS.map(opt => {
                                 const isChecked = finalAttractiveness[opt.id];
                                 return (
                                   <div 
                                     key={opt.id} onClick={() => handleFinalAttractChange(opt.id)}
                                     className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start ${isChecked ? 'border-[#8A1538] bg-white shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                   >
                                     <div className={`w-4 h-4 rounded mr-3 mt-0.5 flex-shrink-0 flex items-center justify-center border ${isChecked ? 'bg-[#8A1538] border-[#8A1538]' : 'border-gray-400'}`}>
                                       {isChecked && <CheckCircle className="w-3 h-3 text-white"/>}
                                     </div>
                                     <span className={`font-bold text-xs md:text-sm leading-tight ${isChecked ? 'text-[#8A1538]' : 'text-gray-700'}`}>{opt.label}</span>
                                   </div>
                                 )
                               })}
                             </div>

                             <label className="font-bold text-gray-800 block mb-3 flex flex-col md:flex-row md:items-center">
                               <span className="flex items-center"><Edit3 className="w-4 h-4 mr-1.5 text-[#8A1538]"/> 1위 선정 상세 사유</span>
                               <span className="text-xs font-bold text-red-500 md:ml-2 mt-1 md:mt-0">(필수 작성)</span>
                             </label>
                             <textarea 
                               value={firstTeamReason} onChange={e => setFirstTeamReason(e.target.value)} 
                               className="w-full p-4 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-[#8A1538] outline-none h-28 text-sm resize-none shadow-inner" 
                               placeholder="해당 팀을 1위로 선정한 핵심 이유(강점, 차별성 등)를 구체적으로 서술해주세요." 
                             />
                           </div>
                         )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {localPhase === 10 && !isSubmitted && (
                <div className="absolute bottom-0 w-full bg-white border-t p-5 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] z-30">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <div className="text-xs font-bold text-gray-500 mb-1">총 집행액</div>
                      <div className={`text-2xl font-black leading-none ${TOTAL_BUDGET-finalTotal===0 ? 'text-green-600':'text-[#8A1538]'}`}>{finalTotal} <span className="text-sm text-gray-400">/ 100만</span></div>
                    </div>
                    <div className={`text-sm font-bold px-3 py-1 rounded-full ${TOTAL_BUDGET-finalTotal===0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>잔액: {TOTAL_BUDGET-finalTotal}만</div>
                  </div>
                  <div className="w-full bg-gray-200 h-2 mb-4 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${TOTAL_BUDGET-finalTotal===0 ? 'bg-green-500':'bg-[#8A1538]'}`} style={{width: `${Math.min((finalTotal/100)*100, 100)}%`}}></div></div>
                  
                  <button onClick={submitFinalEval} disabled={!isFinalValid} className={`w-full py-4 rounded-xl font-black text-lg text-white transition-all ${isFinalValid ? 'bg-[#8A1538] hover:bg-[#6e112d] shadow-lg active:scale-95' : 'bg-gray-300'}`}>
                    {finalTotal !== 100 ? '100만원을 모두 분배해주세요' : (derivedFirstTeam === null ? '공동 1위 중 한 팀을 선택해주세요' : (firstTeamReason.trim().length === 0 ? '1위 선정 사유를 작성해주세요' : '최종 제출 완료'))}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}