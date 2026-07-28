import React, { useState, useRef } from 'react';
import { View, TextInput, StyleSheet, Text, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';

const App = () => {
  const [link, setLink] = useState('');
  const [status, setStatus] = useState('');
  const [isInjecting, setIsInjecting] = useState(false);
  const [loadWebView, setLoadWebView] = useState(false);
  const [injectedJS, setInjectedJS] = useState('');
  const webviewRef = useRef(null);

  const handleInject = async () => {
    if (!link) {
      setStatus('❌ لطفاً لینک را وارد کنید.');
      return;
    }

    setIsInjecting(true);
    setStatus('⏳ در حال دریافت اطلاعات از سرور...');
    setLoadWebView(false);

    try {
      const response = await fetch(link);
      const data = await response.json();

      if (!data || !data.origins) {
        throw new Error('ساختار داده نامعتبر است.');
      }

      setStatus('⏳ در حال پاکسازی و تزریق امن...');

      let tokenMsValue = '';
      let refreshValue = '';
      let localStorageItems = data.origins[0].localStorage || [];

      const tokenObj = localStorageItems.find(x => x.name === 'tokenMS');
      if (tokenObj) tokenMsValue = tokenObj.value;

      const refreshObj = localStorageItems.find(x => x.name === 'refresh_token');
      if (refreshObj) refreshValue = refreshObj.value;

      // بازنویسی لاجیک دقیقاً مشابه افزونه کروم برای جلوگیری از قطعی اکانت
      const jsCode = `
        // ۱. پاکسازی کامل ردپاهای قبلی
        window.localStorage.clear();
        window.sessionStorage.clear();

        // ۲. تزریق مستقیم کوکی‌ها در مرورگر برای جلوگیری از تاخیر فریم‌ورک
        document.cookie = "tokenMS=${tokenMsValue}; domain=.okala.com; path=/; secure; samesite=none;";
        document.cookie = "refresh_token=${refreshValue}; domain=.okala.com; path=/; secure; samesite=none;";

        // ۳. تزریق دیتای جدید به استوریج
        ${localStorageItems.map(item => `window.localStorage.setItem('${item.name}', '${item.value}');`).join('\n')}
        
        true;
      `;
      
      setInjectedJS(jsCode);

      setStatus('✅ با موفقیت تزریق شد!');
      
      // هدایت کاربر به مرورگر
      setTimeout(() => {
        setLoadWebView(true);
        setIsInjecting(false);
        setStatus('');
      }, 500);

    } catch (error) {
      setStatus('❌ خطا: ' + error.message);
      setIsInjecting(false);
    }
  };

  const closeWebView = () => {
    setLoadWebView(false);
    setLink('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {!loadWebView ? (
        <View style={styles.centerWrapper}>
          <View style={styles.card}>
            <View style={styles.iconPlaceholder}>
              <Text style={styles.iconText}>🔗</Text>
            </View>
            <Text style={styles.title}>تزریق‌گر هوشمند اکالا</Text>
            
            <TextInput
              style={styles.input}
              placeholder="لینک دسترسی را وارد نمایید..."
              placeholderTextColor="#95a5a6"
              value={link}
              onChangeText={setLink}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <TouchableOpacity 
              style={[styles.button, isInjecting && styles.buttonDisabled]} 
              onPress={handleInject} 
              disabled={isInjecting}
            >
              {isInjecting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>ورود به اکانت</Text>
              )}
            </TouchableOpacity>
            
            {status !== '' && (
              <Text style={[styles.statusText, status.includes('خطا') ? styles.errorText : styles.successText]}>
                {status}
              </Text>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.webviewContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={closeWebView} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>✕ خروج</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>مرورگر اکالا</Text>
            <View style={{width: 50}} />
          </View>

          <WebView
            ref={webviewRef}
            // لود مستقیم صفحه اصلی همانند نسخه کروم
            source={{ uri: 'https://www.okala.com/' }}
            injectedJavaScriptBeforeContentLoaded={injectedJS}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  centerWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: {
    backgroundColor: '#ffffff',
    width: '100%',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    alignItems: 'center',
  },
  iconPlaceholder: { width: 60, height: 60, backgroundColor: '#fce4ec', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  iconText: { fontSize: 28 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#d81b60', marginBottom: 24 },
  input: {
    width: '100%', backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#ccc', borderRadius: 5,
    padding: 12, fontSize: 14, color: '#333', marginBottom: 20, textAlign: 'left'
  },
  button: {
    width: '100%', backgroundColor: '#d81b60', paddingVertical: 14, borderRadius: 5,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row'
  },
  buttonDisabled: { backgroundColor: '#ad1450' },
  buttonText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  statusText: { marginTop: 16, fontSize: 13, textAlign: 'center', fontWeight: 'bold' },
  errorText: { color: 'red' },
  successText: { color: 'green' },
  
  webviewContainer: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#ffffff', paddingVertical: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#ecf0f1', elevation: 2,
  },
  headerTitle: { color: '#d81b60', fontSize: 16, fontWeight: 'bold' },
  headerButton: { padding: 8, backgroundColor: '#f8f9fa', borderRadius: 8 },
  headerButtonText: { color: '#333', fontSize: 13, fontWeight: 'bold' },
});

export default App;
