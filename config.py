BASE_URL = "http://127.0.0.1:8000/{path}/stream"
CHAT_STREAM_URL = BASE_URL.format(path="chat")
SYMPTOM_CHECKER_STREAM_URL = BASE_URL.format(path="symptom_checker")
LAB_REPORT_ANALYSIS_STREAM_URL = BASE_URL.format(path="lab_report_analysis")
MENTAL_HEALTH_STREAM_URL = BASE_URL.format(path="mental_health_support")