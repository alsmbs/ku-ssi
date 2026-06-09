import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { 
  Play, CheckCircle, MonitorUp, Smartphone, Settings, AlertCircle, 
  DollarSign, LogOut, BarChart3, Download, Users, TrendingUp, Trophy, 
  ChevronRight, Building2, Presentation, Loader2, Activity,
  UserCheck, ChevronDown, ChevronUp, FileText, Eye, Calculator, PieChart, Clock, Pause, Square, CheckSquare, Edit3
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'ku-ir-eval-v7';

// === [기본 설정 데이터] ===
const DEFAULT_TEAMS = [
  { id: 1, name: '에코노베이션', desc: '다회용기 순환 IT 플랫폼', membersStr: '20260001,홍길동\n20260002,김철수\n20260003,이영희\n20260004,박학생' },
  { id: 2, name: '시니어링크', desc: '시니어 일자리 매칭 서비스', membersStr: '20260005,김고대\n20260006,이안암\n20260007,최참살' },
  { id: 3, name: '그린라이트', desc: '시각장애인 보행 보조 솔루션', membersStr: '20260008,박테스트' },
  { id: 4, name: '에듀퀄리티', desc: '정보격차 해소용 AI 튜터', membersStr: '' },
  { id: 5, name: '로컬루트', desc: '지역 농산물 직거래 플랫폼', membersStr: '' },
  { id: 6, name: '마인드케어', desc: '청년 우울증 예방 커뮤니티', membersStr: '' },
  { id: 7, name: '펫투게더', desc: '유기동물 입양 연계 서비스', membersStr: '' },
];

const ATTRACT_OPTIONS = [
  { id: 'socialImpact', label: '문제 해결의 명확성' },
  { id: 'profitability', label: '비즈니스 모델 수익성 및 실현성' },
  { id: 'marketAnalysis', label: '시장 분석 및 타겟 고객 타당성' },
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
  
  // 글로벌 & 로컬 동기화
  const [globalPhase, setGlobalPhase] = useState(0); 
  const [localPhase, setLocalPhase] = useState(0);
  const [teamsConfig, setTeamsConfig] = useState(DEFAULT_TEAMS);
  
  // 타이머 동기화 상태
  const [timerSync, setTimerSync] = useState({ isRunning: false, endsAt: 0, remaining: 0, duration: 0 });
  const [timeLeft, setTimeLeft] = useState(0);

  // 관리자 상태
  const [adminTab, setAdminTab] = useState('control'); 
  const [submissionsList, setSubmissionsList] = useState([]);
  const [activeUsers, setActiveUsers] = useState({}); 
  const [expandedTeam, setExpandedTeam] = useState(null); 
  const [expandedStudent, setExpandedStudent] = useState(null); 

  // 학생 상태 & 자동 저장
  const [evaluations, setEvaluations] = useState(
    Array.from({ length: 7 }, (_, i) => ({ 
      teamId: i + 1, problem: 0, solution: 0, scaleup: 0, comment: '', tempAmount: '' 
    }))
  );
  const [finalInvestments, setFinalInvestments] = useState({ 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 });
  const [finalAttractiveness, setFinalAttractiveness] = useState({ socialImpact: false, profitability: false, marketAnalysis: false, presentation: false });
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 팀 설정에서 전체 학생 명부 자동 생성
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
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (err) {}
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
        if (role === 'student' && data.phase !== globalPhase) setLocalPhase(data.phase);
        if (data.teams) setTeamsConfig(data.teams);
        if (data.timer) setTimerSync(data.timer);
      } else {
        setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'state'), { phase: 0, teams: teamsConfig, timer: timerSync });
      }
    });

    const unsubSubmissions = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'submissions'), (snapshot) => {
      const subs = [];
      snapshot.forEach(doc => subs.push(doc.data()));
      setSubmissionsList(subs);
      if (role === 'student' && studentInfo && subs.find(s => s.studentId === studentInfo.studentId)) setIsSubmitted(true);
    });

    const unsubActive = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'active_users'), (snapshot) => {
      const activeData = {};
      snapshot.forEach(doc => { activeData[doc.id] = doc.data(); });
      setActiveUsers(activeData);
    });

    return () => { unsubPhase(); unsubSubmissions(); unsubActive(); };
  }, [user, role, studentInfo, globalPhase]);

  // === [타이머(스톱워치) 로직] ===
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
            timestamp: new Date().toISOString(), evaluations, finalInvestments, finalAttractiveness, connected: true
          }, { merge: true });
        } catch(e) {}
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [evaluations, finalInvestments, finalAttractiveness, role, studentInfo, isSubmitted]);

  // Phase 8 진입 시 임시 금액 복사
  useEffect(() => {
    if (globalPhase === 8 && localPhase === 8 && role === 'student') {
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
    if (loginId === 'admin' && loginName === '교수님') { setRole('admin'); return; }
    const student = studentList.find(s => s.id === loginId && s.name === loginName);
    if (student) {
      setStudentInfo({ studentId: student.id, name: student.name, myTeam: student.team });
      setRole('student'); setLocalPhase(globalPhase);
      if (user) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'active_users', student.id), { connected: true, timestamp: new Date().toISOString() }, { merge: true });
    } else showToast('일치하는 정보가 없습니다. 관리자에게 문의하세요.');
  };

  const changePhase = async (newPhase) => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'state'), { phase: newPhase }, { merge: true });
    showToast(`Phase ${newPhase} 동기화 완료`);
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
        evaluations, finalInvestments, finalAttractiveness, timestamp: new Date().toISOString()
      });
      setIsSubmitted(true); showToast('포트폴리오가 제출되었습니다.');
    } catch (error) { showToast("제출 오류 발생"); }
  };

  // === [환산 점수 재계산 (Re-calculate)] ===
  const getInvestmentDetails = () => {
    const details = { 1:{total:0, count:0, investors:[]}, 2:{total:0, count:0, investors:[]}, 3:{total:0, count:0, investors:[]}, 4:{total:0, count:0, investors:[]}, 5:{total:0, count:0, investors:[]}, 6:{total:0, count:0, investors:[]}, 7:{total:0, count:0, investors:[]} };
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
    csvContent += "\n\n제출일시,학번,이름,소속팀,총투자액(본인),1위투자팀_선택매력포인트,";
    for (let i=1; i<=7; i++) csvContent += `${i}팀투자,`;
    for (let i=1; i<=7; i++) csvContent += `${i}팀_P,${i}팀_S,${i}팀_Scale,${i}팀_코멘트,`;
    csvContent += "\n";
    submissionsList.forEach(sub => {
      const total = Object.values(sub.finalInvestments).reduce((a,b)=>a+b, 0);
      const attracts = ATTRACT_OPTIONS.filter(opt => sub.finalAttractiveness?.[opt.id]).map(opt => opt.label.split(' ')[0]).join('|');
      let row = `"${new Date(sub.timestamp).toLocaleString()}","${sub.studentId}","${sub.name}",${sub.myTeam},${total},"${attracts}",`;
      for (let i=1; i<=7; i++) row += `${sub.finalInvestments[i] || 0},`;
      sub.evaluations.forEach(ev => { 
        row += `${ev.problem||0},${ev.solution||0},${ev.scaleup||0},"${(ev.comment||'').replace(/"/g, '""').replace(/\n/g, ' ')}",`; 
      });
      csvContent += row + "\n";
    });
    const link = document.createElement("a"); link.href = encodeURI(csvContent); link.download = `KU_IR_최종결과.csv`; link.click();
  };

  const downloadMonitoringExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF상태,학번,이름,소속팀,최근활동,1위투자팀_선택매력포인트,";
    for (let i=1; i<=7; i++) csvContent += `${i}팀_임시금액,${i}팀_P,${i}팀_S,${i}팀_Scale,${i}팀_초안코멘트,`;
    csvContent += "\n";
    studentList.forEach(s => {
      const isSub = submissionsList.find(sub => sub.studentId === s.id);
      const isActive = activeUsers[s.id];
      const studentData = isSub ? isSub.evaluations : (isActive?.evaluations || []);
      const finalAttr = isSub ? isSub.finalAttractiveness : (isActive?.finalAttractiveness || {});
      const status = isSub ? '제출완료' : isActive ? '작성중' : '미접속';
      const time = isActive?.timestamp ? new Date(isActive.timestamp).toLocaleTimeString() : '';
      const attracts = ATTRACT_OPTIONS.filter(opt => finalAttr[opt.id]).map(opt => opt.label.split(' ')[0]).join('|');
      
      let row = `${status},"${s.id}","${s.name}",${s.team},"${time}","${attracts}",`;
      for(let i=1; i<=7; i++) {
        const ev = studentData.find(e => e.teamId === i) || {};
        row += `${ev.tempAmount||0},${ev.problem||0},${ev.solution||0},${ev.scaleup||0},"${(ev.comment||'').replace(/"/g, '""').replace(/\n/g, ' ')}",`;
      }
      csvContent += row + "\n";
    });
    const link = document.createElement("a"); link.href = encodeURI(csvContent); link.download = `KU_IR_모니터링초안.csv`; link.click();
  };

  // === [유효성 검증 및 파생 변수] ===
  const TOTAL_BUDGET = 100;
  const finalTotal = Object.values(finalInvestments).reduce((a, b) => a + b, 0);
  const maxInvestment = Math.max(...Object.values(finalInvestments));
  const topTeams = Object.keys(finalInvestments).filter(team => finalInvestments[team] === maxInvestment && maxInvestment > 0);
  const topTeamsText = topTeams.length > 0 ? topTeams.map(t => `${t}팀`).join(', ') : '최고 투자 팀';
  
  const isAttractSelected = Object.values(finalAttractiveness).some(Boolean);
  const isFinalValid = finalTotal === TOTAL_BUDGET && 
    Object.values(finalInvestments).filter(v => v > 0).length >= 2 && 
    Object.values(finalInvestments).every(v => v <= 50) && 
    (studentInfo?.myTeam ? finalInvestments[studentInfo.myTeam] === 0 : true) &&
    isAttractSelected;

  return (
    <div className="min-h-screen bg-[#F4F4F4] font-sans text-gray-800 pb-10">
      
      {/* 글로벌 헤더 */}
      <div className="bg-[#8A1538] text-white p-3 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2 px-4">
          <Building2 className="w-6 h-6 text-[#B4975A]" />
          <span className="font-black tracking-wider text-sm md:text-lg">KOREA UNIV. <span className="font-light">IR DEMODAY</span></span>
        </div>
        <div className="flex items-center space-x-2 bg-black/20 p-1 rounded-lg">
          <button onClick={() => setDeviceMode('pc')} className={`p-2 rounded flex items-center transition ${deviceMode === 'pc' ? 'bg-white text-[#8A1538]' : 'text-gray-300'}`}><MonitorUp className="w-4 h-4" /><span className="hidden md:inline ml-2 text-xs font-bold">PC</span></button>
          <button onClick={() => setDeviceMode('mobile')} className={`p-2 rounded flex items-center transition ${deviceMode === 'mobile' ? 'bg-white text-[#8A1538]' : 'text-gray-300'}`}><Smartphone className="w-4 h-4" /><span className="hidden md:inline ml-2 text-xs font-bold">Mobile</span></button>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] animate-[slideDown_0.3s_ease-out]">
          <div className="bg-gray-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center font-bold text-sm"><CheckCircle className="w-4 h-4 mr-2 text-green-400" />{toastMessage}</div>
        </div>
      )}

      <div className="pt-8 px-4 flex justify-center">
        <div className={deviceMode === 'pc' ? "max-w-7xl w-full mx-auto shadow-2xl rounded-xl overflow-hidden min-h-[85vh] flex flex-col bg-white" : "max-w-md w-full mx-auto shadow-2xl border-x min-h-screen flex flex-col bg-gray-50"}>

          {/* === 1. 로그인 === */}
          {!role && (
            <div className="flex-1 flex flex-col p-8 items-center justify-center bg-white">
              <div className="w-20 h-20 bg-[#8A1538] rounded-2xl flex items-center justify-center shadow-lg mb-6"><Presentation className="w-10 h-10 text-white" /></div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">모의 IR 투자심사</h1>
              <p className="text-gray-500 mb-8 font-medium">소셜 이노베이션 동료평가 (엔젤투자 시뮬레이션)</p>
              <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} required className="w-full p-4 rounded-xl border focus:ring-2 focus:ring-[#8A1538] outline-none" placeholder="학번 (admin)" />
                <input type="text" value={loginName} onChange={e => setLoginName(e.target.value)} required className="w-full p-4 rounded-xl border focus:ring-2 focus:ring-[#8A1538] outline-none" placeholder="이름 (교수님)" />
                <button type="submit" className="w-full bg-[#8A1538] text-white font-bold py-4 rounded-xl shadow-md flex justify-center items-center hover:bg-[#6e112d]">심사장 입장 <ChevronRight className="w-5 h-5 ml-1" /></button>
              </form>
            </div>
          )}

          {/* === 2. 교수자 대시보드 === */}
          {role === 'admin' && (
            <div className="flex-1 flex flex-col h-full bg-slate-50">
              <div className="bg-white border-b border-gray-200 px-6 flex justify-between items-center sticky top-0 z-10 shadow-sm overflow-x-auto">
                <div className="flex space-x-1 min-w-max">
                  <button onClick={() => setAdminTab('control')} className={`py-4 px-6 font-bold text-sm border-b-2 transition ${adminTab === 'control' ? 'border-[#8A1538] text-[#8A1538]' : 'border-transparent text-gray-500'}`}><Play className="w-4 h-4 inline mr-2"/> 진행 제어 (리모컨)</button>
                  <button onClick={() => setAdminTab('settings')} className={`py-4 px-6 font-bold text-sm border-b-2 transition ${adminTab === 'settings' ? 'border-[#8A1538] text-[#8A1538]' : 'border-transparent text-gray-500'}`}><Settings className="w-4 h-4 inline mr-2"/> 사전 설정 (팀/명단)</button>
                  <button onClick={() => setAdminTab('monitoring')} className={`py-4 px-6 font-bold text-sm border-b-2 transition ${adminTab === 'monitoring' ? 'border-[#8A1538] text-[#8A1538]' : 'border-transparent text-gray-500'}`}><Activity className="w-4 h-4 inline mr-2"/> 학생 모니터링</button>
                  <button onClick={() => setAdminTab('investments')} className={`py-4 px-6 font-bold text-sm border-b-2 transition ${adminTab === 'investments' ? 'border-[#8A1538] text-[#8A1538]' : 'border-transparent text-gray-500'}`}><TrendingUp className="w-4 h-4 inline mr-2"/> 최종 현황판</button>
                </div>
                <button onClick={() => setRole(null)} className="text-gray-400 font-bold ml-4 hover:text-red-500"><LogOut className="w-4 h-4"/></button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                
                {/* 탭 1: 컨트롤 & 타이머 */}
                {adminTab === 'control' && (
                  <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                      <h3 className="text-xl font-black mb-4 flex items-center"><Clock className="w-6 h-6 mr-2 text-blue-600"/> 라이브 타이머 (동기화)</h3>
                      <div className="text-center bg-gray-900 text-white p-6 rounded-2xl shadow-inner mb-4">
                        <div className="text-6xl font-mono font-black tabular-nums tracking-wider">{formatTime(timeLeft)}</div>
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

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                      <h3 className="text-xl font-black mb-4 flex items-center"><MonitorUp className="w-6 h-6 mr-2 text-[#8A1538]"/> 학생 화면 제어</h3>
                      <button onClick={() => changePhase(0)} className={`w-full p-4 mb-4 rounded-xl font-bold flex justify-between border transition-all ${globalPhase === 0 ? 'bg-[#8A1538] text-white border-[#8A1538] shadow-md' : 'bg-gray-50'}`}>[Phase 0] 대기실 (안내화면) {globalPhase === 0 && <span className="flex w-3 h-3 bg-red-400 rounded-full animate-pulse"></span>}</button>
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        {[1,2,3,4,5,6,7].map(n => {
                          const teamName = teamsConfig.find(t => t.id === n)?.name || `${n}팀`;
                          return (
                            <button key={n} onClick={() => changePhase(n)} className={`p-4 rounded-xl font-bold border transition-all ${globalPhase === n ? 'bg-[#8A1538] text-white border-[#8A1538] shadow-md scale-105' : 'bg-gray-50 hover:bg-gray-100'}`}>
                              <div className="flex flex-col items-center">
                                <Play className={`w-5 h-5 mb-1 ${globalPhase === n ? 'text-[#B4975A]' : 'text-gray-400'}`} /> 
                                <span>{n}팀 ({teamName})</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      <button onClick={() => changePhase(8)} className={`w-full p-6 rounded-xl font-black text-xl border shadow-sm transition-all ${globalPhase === 8 ? 'bg-[#B4975A] text-white border-[#B4975A] shadow-md' : 'bg-yellow-50 text-yellow-800'}`}>[Phase 8] 최종 투자 오픈</button>
                    </div>
                  </div>
                )}

                {/* 탭 2: 설정 */}
                {adminTab === 'settings' && (
                  <div className="max-w-6xl mx-auto">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                      <div className="flex justify-between items-end mb-6">
                        <div>
                          <h3 className="text-xl font-black flex items-center"><Users className="w-6 h-6 mr-2 text-[#8A1538]"/> 팀 단위 명부 및 모수 설정</h3>
                          <p className="text-sm text-gray-500 mt-1">팀원 명단(학번, 이름)을 입력하면 전체 명부와 모수(인원수)가 자동으로 산출됩니다.</p>
                        </div>
                        <div className="bg-gray-100 px-4 py-2 rounded-lg font-bold text-[#8A1538] border border-gray-200 shadow-inner">
                          전체 자동 산출 인원 : {studentList.length}명
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
                                value={team.membersStr} 
                                onChange={(e) => handleTeamConfigChange(team.id, 'membersStr', e.target.value)} 
                                className="w-full h-32 p-3 border rounded-lg text-xs font-mono bg-white focus:ring-1 focus:ring-[#8A1538] outline-none resize-none leading-relaxed" 
                                placeholder="20260001,홍길동&#10;20260002,김철수"
                              />
                            </div>
                          )
                        })}
                      </div>

                      <button onClick={updateTeamsConfig} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black shadow-lg">모든 설정 서버에 저장하기</button>
                    </div>
                  </div>
                )}

                {/* 탭 3: 모니터링 */}
                {adminTab === 'monitoring' && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-lg font-bold flex items-center"><Eye className="w-5 h-5 mr-2 text-blue-600"/> 실시간 노트 엿보기 (X-Ray)</h3>
                        <p className="text-xs text-gray-500 mt-1">학생들이 각 팀 평가 시 입력 중인 데이터 초안입니다.</p>
                      </div>
                      <button onClick={downloadMonitoringExcel} className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg font-bold flex items-center text-sm border border-blue-200">
                        <Download className="w-4 h-4 mr-1"/> 진행상태 (초안) 엑셀 다운로드
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 font-bold">
                          <tr><th className="p-3">상태</th><th className="p-3">학번</th><th className="p-3">이름 (팀)</th><th className="p-3">최근 활동 시간</th><th className="p-3 text-right">답안 보기</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {studentList.map(s => {
                            const isSub = submissionsList.find(sub => sub.studentId === s.id);
                            const isActive = activeUsers[s.id];
                            const studentData = isSub ? isSub.evaluations : (isActive?.evaluations || []);
                            const studentAttract = isSub ? isSub.finalAttractiveness : (isActive?.finalAttractiveness || {});
                            const status = isSub ? '제출완료' : isActive ? '작성중' : '미접속';
                            const timeStr = isSub ? new Date(isSub.timestamp).toLocaleTimeString() : (isActive?.timestamp ? new Date(isActive.timestamp).toLocaleTimeString() : '-');
                            
                            let statusUI = <span className="bg-gray-100 text-gray-400 px-2 py-1 rounded text-xs font-bold">미접속</span>;
                            if (isSub) statusUI = <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200">제출완료</span>;
                            else if (isActive) statusUI = <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200 animate-pulse">평가중</span>;

                            return (
                              <React.Fragment key={s.id}>
                                <tr className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setExpandedStudent(expandedStudent === s.id ? null : s.id)}>
                                  <td className="p-3">{statusUI}</td>
                                  <td className="p-3 font-mono text-gray-500">{s.id}</td>
                                  <td className="p-3 font-bold">{s.name} <span className="text-xs text-gray-400">({s.team}팀)</span></td>
                                  <td className="p-3 text-xs text-gray-500 font-mono">{timeStr}</td>
                                  <td className="p-3 text-right"><button className="text-blue-600 font-bold text-xs bg-blue-100 px-3 py-1.5 rounded-full">{expandedStudent === s.id ? '닫기' : '펼쳐보기'}</button></td>
                                </tr>
                                {expandedStudent === s.id && (
                                  <tr>
                                    <td colSpan="5" className="p-0 border-b-2 border-blue-200">
                                      <div className="bg-gray-800 p-6 shadow-inner">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                                          <span className="text-white font-bold text-sm mr-3">1위 팀 투자 매력 포인트 (Phase 8) : </span>
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
                )}

                {/* 탭 4: 최종 현황판 */}
                {adminTab === 'investments' && (
                  <div className="max-w-5xl mx-auto space-y-6">
                    <div className="bg-white p-6 rounded-2xl flex justify-between items-center shadow-sm border">
                      <div>
                        <h3 className="text-xl font-black flex items-center"><Calculator className="w-6 h-6 mr-2 text-[#8A1538]"/> 1인당 환산 점수 랭킹</h3>
                        <p className="text-sm text-gray-500 mt-1">산출식: 팀 누적 투자금액 ÷ (전체수강생 {studentList.length}명 - 해당 팀 모수 인원)</p>
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
            <div className="flex-1 flex flex-col relative bg-white">
              
              {/* 상단 프로필 및 동기화 타이머 */}
              <div className="bg-gray-900 text-white p-4 flex justify-between items-center z-20 shadow-md">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-[#8A1538] rounded-full flex items-center justify-center font-black mr-3 shadow-inner text-lg">{studentInfo.myTeam}</div>
                  <div><div className="text-xs text-gray-400 font-bold uppercase tracking-wider">엔젤 투자자</div><div className="font-bold">{studentInfo.name}</div></div>
                </div>
                {(timerSync.isRunning || timeLeft > 0) && !isSubmitted && (
                  <div className="flex items-center bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-lg shadow-inner">
                    <Clock className={`w-4 h-4 mr-2 ${timeLeft <= 60000 ? 'text-red-500 animate-pulse' : 'text-[#B4975A]'}`}/>
                    <span className={`font-mono font-bold tracking-wider ${timeLeft <= 60000 ? 'text-red-500' : 'text-white'}`}>{formatTime(timeLeft)}</span>
                  </div>
                )}
              </div>

              {globalPhase > 0 && !isSubmitted && (
                <div className="bg-white border-b border-gray-200 shadow-sm z-10 sticky top-0 flex overflow-x-auto px-2 py-2 gap-2 hide-scrollbar">
                  {[1,2,3,4,5,6,7].map(num => {
                    if (num > globalPhase && globalPhase !== 8) return null; 
                    return (
                      <button key={num} onClick={() => setLocalPhase(num)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${localPhase === num ? 'bg-[#8A1538] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {num}팀 리뷰
                      </button>
                    )
                  })}
                  {globalPhase === 8 && (
                    <button onClick={() => setLocalPhase(8)} className={`px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center ${localPhase === 8 ? 'bg-[#B4975A] text-white shadow-md' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}>
                      포트폴리오 확정
                    </button>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-y-auto pb-36">
                {isSubmitted ? (
                  <div className="p-10 flex flex-col items-center justify-center h-full text-center">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"><CheckCircle className="w-12 h-12 text-green-600" /></div>
                    <h2 className="text-2xl font-black text-gray-800">투자 포트폴리오 제출 완료</h2>
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
                          ✓ 최소 2개팀 분산 투자 / 한 팀당 최대 50만원<br/><br/>
                          모수 제외 환산 로직이 적용되어 팀원 수의 유불리가 완벽히 통제됩니다. 오직 발표 내용과 사업성만 보고 투자하십시오.
                        </div>
                      </div>
                    )}

                    {/* 개별 평가 폼 (다중 선택 제거됨, 오직 P-S-S) */}
                    {localPhase >= 1 && localPhase <= 7 && (() => {
                      const currentTeam = localPhase;
                      const evalData = evaluations[currentTeam - 1];
                      const teamInfo = teamsConfig.find(t => t.id === currentTeam) || { name: '', desc: '' };

                      if (studentInfo.myTeam === currentTeam) return (
                        <div className="p-10 text-center mt-20"><AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4"/><h2 className="text-xl font-bold">본인 팀 (평가 제외)</h2></div>
                      );
                      return (
                        <div className="p-5 md:p-8">
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
                            <label className="font-bold text-gray-800 block mb-4 flex items-center"><Edit3 className="w-5 h-5 mr-2 text-[#8A1538]"/> 1. 세부 항목 평가 (1~5점)</label>
                            
                            <div className="mb-5">
                              <label className="font-bold text-sm mb-1 block text-gray-700">Problem (문제 정의)</label>
                              <div className="flex gap-2">
                                {[1,2,3,4,5].map(s => <button key={`p${s}`} onClick={() => handleEvalChange(currentTeam-1, 'problem', s)} className={`flex-1 py-2.5 rounded-lg font-bold border transition-all ${evalData.problem === s ? 'bg-[#8A1538] text-white shadow' : 'bg-gray-50 text-gray-400'}`}>{s}</button>)}
                              </div>
                            </div>
                            <div className="mb-5">
                              <label className="font-bold text-sm mb-1 block text-gray-700">Solution (솔루션 해결성)</label>
                              <div className="flex gap-2">
                                {[1,2,3,4,5].map(s => <button key={`s${s}`} onClick={() => handleEvalChange(currentTeam-1, 'solution', s)} className={`flex-1 py-2.5 rounded-lg font-bold border transition-all ${evalData.solution === s ? 'bg-[#8A1538] text-white shadow' : 'bg-gray-50 text-gray-400'}`}>{s}</button>)}
                              </div>
                            </div>
                            <div className="mb-2">
                              <label className="font-bold text-sm mb-1 block text-gray-700">Scale-up (성장 가능성)</label>
                              <div className="flex gap-2">
                                {[1,2,3,4,5].map(s => <button key={`sc${s}`} onClick={() => handleEvalChange(currentTeam-1, 'scaleup', s)} className={`flex-1 py-2.5 rounded-lg font-bold border transition-all ${evalData.scaleup === s ? 'bg-[#8A1538] text-white shadow' : 'bg-gray-50 text-gray-400'}`}>{s}</button>)}
                              </div>
                            </div>
                          </div>

                          <div className="mb-8">
                            <label className="font-bold text-gray-800 block mb-2">2. 심사역 한 줄 코멘트</label>
                            <textarea 
                              value={evalData.comment} onChange={e => handleEvalChange(currentTeam - 1, 'comment', e.target.value)} 
                              className="w-full p-4 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#8A1538] outline-none h-24 text-sm resize-none" 
                              placeholder="가장 매력적인 포인트나 투자 리스크를 작성해주세요." 
                            />
                          </div>

                          {/* 임시 투자금 */}
                          <div className="bg-[#8A1538]/5 p-5 rounded-2xl border border-[#8A1538]/20 focus-within:ring-2 focus-within:ring-[#8A1538] transition-all">
                            <label className="font-black text-[#8A1538] block mb-2 text-sm flex items-center"><DollarSign className="w-4 h-4 mr-1"/>3. 임시 가치 산정 (만원)</label>
                            <div className="flex items-center bg-white rounded-xl overflow-hidden border border-gray-300">
                              <input 
                                type="text" inputMode="numeric"
                                value={evalData.tempAmount} onChange={e => handleEvalChange(currentTeam-1, 'tempAmount', e.target.value.replace(/[^0-9]/g, ''))} 
                                className="flex-1 p-4 text-2xl font-black text-right outline-none text-[#8A1538]" 
                                placeholder="0" 
                              />
                              <span className="px-4 font-bold text-gray-500 border-l bg-gray-50 flex items-center">만원</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Phase 8 최종 배분 & 매력포인트 선택 */}
                    {localPhase === 8 && (
                      <div className="p-5">
                         <div className="bg-[#B4975A] text-white p-6 rounded-2xl mb-6 shadow-md">
                           <h2 className="text-xl font-black flex items-center"><PieChart className="w-5 h-5 mr-2"/> 최종 투자금 확정</h2>
                           <p className="text-sm mt-1 opacity-90 font-medium">100만 원 한도 / 최대 50만 원 / 최소 2팀 분산</p>
                         </div>

                         <div className="space-y-4 mb-8">
                          {[1,2,3,4,5,6,7].map(num => {
                            if (studentInfo.myTeam === num) return null;
                            const isOver = finalInvestments[num] > 50;
                            const teamInfo = teamsConfig.find(t => t.id === num) || { name: '' };
                            return (
                              <div key={num} className={`p-4 rounded-xl border transition-all shadow-sm ${isOver ? 'border-red-400 bg-red-50' : 'bg-white'}`}>
                                <div className="flex justify-between items-center mb-3">
                                  <div>
                                    <span className="font-black text-lg text-gray-800">{num}팀</span>
                                    <span className="text-sm text-gray-500 ml-2 font-bold">{teamInfo.name}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <input 
                                      type="text" inputMode="numeric"
                                      value={finalInvestments[num] || ''} onChange={(e) => handleFinalInvestChange(num, e.target.value)} 
                                      className={`w-20 p-2.5 text-right font-black text-lg border rounded-lg outline-none ${isOver ? 'text-red-600 border-red-300' : 'focus:ring-2 focus:ring-[#8A1538] border-gray-300'}`} 
                                      placeholder="0" 
                                    />
                                    <span className="ml-2 text-sm text-gray-600 font-bold">만</span>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 italic line-clamp-2 bg-gray-50 p-2 rounded border border-gray-100">"{evaluations[num-1].comment || '코멘트 없음'}"</div>
                              </div>
                            );
                          })}
                         </div>

                         {/* 최고 투자팀 매력 포인트 다중 선택 */}
                         {topTeams.length > 0 && maxInvestment > 0 && (
                           <div className="bg-[#8A1538]/5 border border-[#8A1538]/20 p-5 rounded-2xl mb-8">
                             <label className="font-black text-gray-800 block mb-3 flex flex-col">
                               <span className="flex items-center"><CheckSquare className="w-5 h-5 mr-2 text-[#8A1538]"/> 1위 투자팀 매력 포인트</span>
                               <span className="text-xs text-gray-500 font-normal mt-1 ml-7">가장 많은 금액을 배정한 <strong className="text-[#8A1538]">{topTeamsText}</strong>의 가장 큰 투자 매력 포인트는 무엇입니까? (다중 선택 가능, 필수)</span>
                             </label>
                             <div className="space-y-2 mt-4">
                               {ATTRACT_OPTIONS.map(opt => {
                                 const isChecked = finalAttractiveness[opt.id];
                                 return (
                                   <div 
                                     key={opt.id} onClick={() => handleFinalAttractChange(opt.id)}
                                     className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center ${isChecked ? 'border-[#8A1538] bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                   >
                                     <div className={`w-5 h-5 rounded mr-3 flex items-center justify-center border ${isChecked ? 'bg-[#8A1538] border-[#8A1538]' : 'border-gray-400'}`}>
                                       {isChecked && <CheckCircle className="w-4 h-4 text-white"/>}
                                     </div>
                                     <span className={`font-bold text-sm ${isChecked ? 'text-[#8A1538]' : 'text-gray-700'}`}>{opt.label}</span>
                                   </div>
                                 )
                               })}
                             </div>
                           </div>
                         )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 하단 최종 제출 바 */}
              {localPhase === 8 && !isSubmitted && (
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
                    {!isAttractSelected ? '1위팀 매력 포인트를 선택해주세요' : '최종 제출 완료'}
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