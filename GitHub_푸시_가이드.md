# GitHub 푸시 가이드

현재 프로젝트를 GitHub에 푸시하는 방법을 안내합니다.

## 📋 사전 준비

1. **GitHub 계정** 필요
2. **GitHub에 새 저장소 생성** (또는 기존 저장소 URL)

## 🚀 단계별 가이드

### 1단계: Git 저장소 초기화 (완료)

이미 다음 명령어로 Git 저장소가 초기화되었습니다:
```bash
git init
```

### 2단계: 파일 스테이징 및 커밋

현재 모든 파일이 스테이징되었습니다. 다음 단계는 커밋입니다:

```bash
# 첫 커밋
git commit -m "Initial commit: Amazon Sales Dashboard with Railway deployment support"

# 또는 더 상세한 커밋 메시지
git commit -m "Initial commit: Amazon Sales Dashboard

- Next.js 16 기반 대시보드 애플리케이션
- Supabase 데이터베이스 연동
- Google Sheets 동기화 기능
- Amazon SP-API 연동 (Next.js API Routes)
- Railway 배포 지원
- Edge Function을 Next.js API Route로 변환 완료"
```

### 3단계: GitHub 저장소 생성

1. [GitHub](https://github.com)에 로그인
2. 오른쪽 상단의 "+" 아이콘 클릭 → "New repository"
3. Repository name: `amazon-sales-dashboard` (또는 원하는 이름)
4. Description (선택사항): "Amazon Sales Dashboard - Next.js 기반 대시보드"
5. Public 또는 Private 선택
6. ⚠️ **"Initialize this repository with a README" 체크하지 마세요** (이미 로컬에 파일이 있음)
7. "Create repository" 클릭

### 4단계: 원격 저장소 연결

GitHub에서 저장소를 생성하면 표시되는 URL을 사용합니다:
- HTTPS: `https://github.com/YOUR_USERNAME/amazon-sales-dashboard.git`
- SSH: `git@github.com:YOUR_USERNAME/amazon-sales-dashboard.git`

```bash
# 원격 저장소 추가 (YOUR_USERNAME을 실제 GitHub 사용자명으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/amazon-sales-dashboard.git

# 또는 SSH 사용 (SSH 키가 설정되어 있는 경우)
git remote add origin git@github.com:YOUR_USERNAME/amazon-sales-dashboard.git
```

### 5단계: GitHub에 푸시

```bash
# 기본 브랜치를 main으로 설정 (필요시)
git branch -M main

# GitHub에 푸시
git push -u origin main
```

### 6단계: 확인

1. GitHub 웹사이트에서 저장소 페이지로 이동
2. 모든 파일이 업로드되었는지 확인
3. README.md 파일이 정상적으로 표시되는지 확인

## ⚠️ 주의사항

### 환경 변수 파일은 커밋하지 않음

`.gitignore` 파일에 다음이 포함되어 있어 안전합니다:
- `.env.local`
- `.env`
- `node_modules/`
- `.next/`

### 민감한 정보 확인

다음 파일들이 `.gitignore`에 포함되어 있는지 확인하세요:
- `.env.local`
- `.env`
- 환경 변수가 포함된 다른 파일

## 🔄 이후 업데이트 방법

코드를 수정한 후 GitHub에 업데이트하려면:

```bash
# 변경사항 확인
git status

# 변경된 파일 스테이징
git add .

# 커밋
git commit -m "커밋 메시지 설명"

# GitHub에 푸시
git push
```

## 📝 추천 커밋 메시지 예시

```bash
# 기능 추가
git commit -m "feat: Amazon 주문 데이터 가져오기 기능 추가"

# 버그 수정
git commit -m "fix: 타입 에러 수정"

# 문서 업데이트
git commit -m "docs: Railway 배포 가이드 추가"

# 리팩토링
git commit -m "refactor: Edge Function을 Next.js API Route로 변환"
```

## 🔐 SSH 키 설정 (선택사항)

SSH 키를 사용하면 매번 비밀번호를 입력할 필요가 없습니다.

1. SSH 키 생성 (이미 있는 경우 생략):
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

2. SSH 키를 GitHub에 추가:
   - GitHub → Settings → SSH and GPG keys → New SSH key
   - 공개 키(`~/.ssh/id_ed25519.pub`) 내용 복사하여 추가

## 💡 문제 해결

### "remote origin already exists" 에러

기존 원격 저장소가 있는 경우:
```bash
# 기존 원격 저장소 확인
git remote -v

# 기존 원격 저장소 제거
git remote remove origin

# 새 원격 저장소 추가
git remote add origin https://github.com/YOUR_USERNAME/amazon-sales-dashboard.git
```

### 인증 에러

HTTPS를 사용하는 경우 Personal Access Token이 필요할 수 있습니다:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token" 클릭
3. 권한 선택 (repo 권한 필요)
4. 토큰 생성 후 복사
5. 푸시 시 비밀번호 대신 토큰 사용

