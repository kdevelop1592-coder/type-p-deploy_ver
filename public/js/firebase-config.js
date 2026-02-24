// Firebase 설정 및 초기화
const firebaseConfig = {
  apiKey: "AIzaSyD0eYGLB3sQEv3ugvrToXqbpfumftD84gk",
  authDomain: "typing-practice-9d7d6.firebaseapp.com",
  projectId: "typing-practice-9d7d6",
  storageBucket: "typing-practice-9d7d6.firebasestorage.app",
  messagingSenderId: "2294036104",
  appId: "1:2294036104:web:d714eca13713e1e86fd13d",
  measurementId: "G-ZSG49LKJRT"
};

// Firebase 앱 초기화
firebase.initializeApp(firebaseConfig);

// 서비스 인스턴스 전역 노출
const auth = firebase.auth();
const db = firebase.firestore();

// 공용 PC 대비: 세션 지속성을 SESSION으로 설정
// → 브라우저 탭/창을 닫으면 로그인 상태 자동 소멸 (localStorage에 저장 안 함)
auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);

// 관리자 이메일
const ADMIN_EMAIL = 'kdevelop1592@gmail.com';
