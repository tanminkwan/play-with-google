const { sendUploadNotification } = require('./lib/email_notifier');

/**
 * 실제 이메일 발송 기능을 테스트하는 실행 파일입니다.
 */
async function testActualEmail() {
    console.log("🚀 Starting Actual Email Send Test...");

    const testData = {
        title: "실제 이메일 발송 테스트 (Antigravity)",
        videoId: "dQw4w9WgXcQ", // Rick Astley - Never Gonna Give You Up (Test ID)
        summary: "이것은 시스템 리팩토링 후 실제 Gmail SMTP를 이용한 이메일 발송 테스트입니다.\n\n여러 개의 이메일 주소로 정상적으로 발송되는지 확인해 주세요."
    };

    try {
        const result = await sendUploadNotification(testData);
        console.log("\n✅ Test Result:", result);
        console.log("📧 Check your inbox(es) to verify!");
    } catch (error) {
        console.error("\n❌ Test Failed:");
        console.error(error);
    }
}

testActualEmail();
