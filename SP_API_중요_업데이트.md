# SP-API 중요 업데이트 (2023년 10월 2일)

## 🎉 좋은 소식!

**SP-API는 더 이상 AWS IAM이나 AWS Signature Version 4를 요구하지 않습니다!**

2023년 10월 2일 발표에 따르면, SP-API 호출 시:
- ✅ **AWS IAM 자격 증명 불필요**
- ✅ **AWS Signature Version 4 서명 불필요**
- ✅ **IAM Role ARN 불필요**

## 📋 필요한 것

**LWA (Login with Amazon) 토큰만 있으면 됩니다:**

1. **Client ID** (SP-API 앱에서 확인)
2. **Client Secret** (SP-API 앱에서 확인)
3. **Refresh Token** (SP-API 앱에서 생성)

## 🔧 Supabase Secrets 설정

**최소 필수 설정** (이것만으로 충분합니다):

```
AMAZON_SP_API_CLIENT_ID=your_client_id_here
AMAZON_SP_API_CLIENT_SECRET=your_client_secret_here
AMAZON_SP_API_REFRESH_TOKEN=your_refresh_token_here
AMAZON_SP_API_BASE_URL=https://sellingpartnerapi-na.amazon.com
```

**선택사항** (더 이상 필요 없지만 호환성을 위해 유지 가능):

```
AMAZON_AWS_ACCESS_KEY_ID=... (선택사항)
AMAZON_AWS_SECRET_ACCESS_KEY=... (선택사항)
AMAZON_IAM_ROLE_ARN=... (선택사항)
```

## ✅ 결론

**IAM Role ARN을 찾지 못해도 문제없습니다!**

- Client ID, Secret, Refresh Token만 있으면 SP-API를 사용할 수 있습니다
- AWS 콘솔에 접속할 필요가 없습니다
- IAM 사용자를 생성할 필요가 없습니다

## 📚 참고 자료

- [SP-API Release Notes](https://developer-docs.amazon.com/sp-api/docs/sp-api-release-notes)
- [SP-API no longer requires AWS IAM or AWS Signature Version 4](https://developer-docs.amazon.com/sp-api/docs/sp-api-release-notes#october-2023-sp-api-release-announcement)





