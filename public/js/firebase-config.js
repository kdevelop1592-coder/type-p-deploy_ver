// Firebase 설정 및 초기화
const firebaseConfig = {
  apiKey: "AIzaSyBn30VdlBsdSZYj4U44kzPXLVGdHsYj57Y",
  authDomain: "type-p-deploy-test.firebaseapp.com",
  projectId: "type-p-deploy-test",
  storageBucket: "type-p-deploy-test.firebasestorage.app",
  messagingSenderId: "204016972695",
  appId: "1:204016972695:web:d889797df46caa15818ad2",
  measurementId: "G-ZSN7ECF7K6"
};

// Firebase 앱 초기화
firebase.initializeApp(firebaseConfig);

// 서비스 인스턴스 전역 노출
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// 공용 PC 대비: 세션 지속성을 SESSION으로 설정
// → 브라우저 탭/창을 닫으면 로그인 상태 자동 소멸 (localStorage에 저장 안 함)
auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);

// 관리자 이메일
const ADMIN_EMAIL = 'kdevelop1592@gmail.com';
