// Supabase 配置
const SUPABASE_URL = 'https://ggeldamquoaovfxkdlu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fm6efSncDCutpl2Y67uqgA_BeFI5rIh';

// 初始化客户端，并挂载到 window 上供其他文件调用
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);