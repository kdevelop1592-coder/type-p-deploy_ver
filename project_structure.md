# 프로젝트 구조 및 내용 파악 (Project Structure and Contents)

이 문서는 `g:\project\type_pra_depl` 폴더의 내용을 분석한 결과입니다. 이 프로젝트는 Firebase를 이용한 웹 애플리케이션으로 구성되어 있습니다.

## 1. 루트 디렉토리 (Root Directory)

| 파일/폴더명 | 설명 |
| :--- | :--- |
| `.firebase/` | Firebase 배포 및 캐시 설정 폴더 |
| `.firebaserc` | Firebase 프로젝트 ID 및 별칭 구성 파일 |
| `.git/` | Git 버전 관리 폴더 |
| `README.md` | 프로젝트 설명 파일 |
| `diff_admin.patch` | 관리자 기능 관련 변경 사항 패치 파일 |
| `firebase.json` | Firebase Hosting, Firestore, Functions 등 서비스 설정 파일 |
| `firestore.indexes.json` | Firestore 데이터베이스 인덱스 정의 파일 |
| `firestore.rules` | Firestore 보안 규칙 정의 파일 |
| `public/` | 실제 웹 서비스에 호스팅되는 정적 파일들이 포함된 폴더 |

## 2. Public 디렉토리 분석

`public/` 폴더 내의 주요 파일 및 구조는 다음과 같습니다.

| 파일/폴더명 | 설명 |
| :--- | :--- |
| `index.html` | 서비스의 메인 접속 페이지 |
| `admin.html` | 관리자용 대시보드 및 관리 페이지 |
| `app.html` | 핵심 애플리케이션 기능 페이지 |
| `bubble.html` | 버블 슈팅 게임 관련 페이지 |
| `myrecords.html` | 사용자 기록 조회 페이지 |
| `profile.html` | 사용자 정보 및 프로필 관리 페이지 |
| `css/` | 스타일시트(CSS) 파일 폴더 |
| `js/` | 자바스크립트(JS) 소스 코드 폴더 |
| `img/` | 프로젝트에 사용된 이미지 자산 폴더 |

## 3. 프로젝트 개요

이 프로젝트는 Firebase Hosting을 기반으로 하며, Firestore 데이터베이스를 사용하여 사용자 데이터와 기록을 관리하는 구조로 보입니다. 주요 기능으로는 사용자의 게임 플레이(버블 슈터), 관리자 기능, 개인 기록 확인 등이 포함되어 있습니다.
