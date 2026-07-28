import React, { useState, useRef } from 'react';
import { View, TextInput, StyleSheet, Text, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import CookieManager from '@react-native-cookies/cookies';

const App = () => {
  const [link, setLink] = useState('');
  const [status, setStatus] = useState('');
  const [isInjecting, setIsInjecting] = useState(false);
  const [loadWebView, setLoadWebView] = useState(false);
  const [injectedJS, setInjectedJS] = useState('');
  const [isWebViewLoading, setIsWebViewLoading] = useState(true);
  const webviewRef = useRef(null);

  const handleInject = async () => {
    if (!link) {
      setStatus('لطفاً یک لینک معتبر وارد نمایید.');
      return;
    }

    setIsInjecting(true);
    setStatus('در حال ارتباط با سرور...');
    setLoadWebView(false);

    try {
      const response = await fetch(link);
      const data = await response.json();

      if (!data || !data.origins) {
        throw new Error('ساختار داده نامعتبر است.');
      }

      setStatus('در حال تنظیم نشست‌های کاربری...');

      await CookieManager.clearAll();

      let tokenMsValue = '';
      let refreshValue = '';
      let localStorageItems = data.origins[0].localStorage || [];

      const tokenObj = localStorageItems.find(x => x.name === 'tokenMS');
      if (tokenObj) tokenMsValue = tokenObj.value;

      const refreshObj = localStorageItems.find(x => x.name === 'refresh_token');
      if (refreshObj) refreshValue = refreshObj.value;

      if (tokenMsValue) {
        await CookieManager.set('https://www.okala.com', {
          name: 'tokenMS', value: tokenMsValue, domain: '.okala.com', path: '/', secure: true,
        });
      }

      if (refreshValue) {
        await CookieManager.set('https://www.okala.com', {
          name: 'refresh_token', value: refreshValue, domain: '.okala.com', path: '/', secure: true,
        });
      }

      // تزریق حافظه محلی به صورت کاملا ایزوله
      const jsCode = `
        window.localStorage.clear();
        window.sessionStorage.clear();
        ${localStorageItems.map(item => `window.localStorage.setItem('${item.name}', '${item.value}');`).join('\n')}
        true;
      `;
      setInjectedJS(jsCode);

      setStatus('ورود موفق. در حال انتقال...');
      setTimeout(() => {
        setLoadWebView(true);
        setIsInjecting(false);
        setStatus('');
      }, 800);

    } catch (error) {
      setStatus('خطا: ' + error.message);
      setIsInjecting(false);
    }
  };

  const reloadWebView = () => {
    if (webviewRef.current) {
      setIsWebViewLoading(true);
      webviewRef.current.reload();
    }
  };

  const closeWebView = () => {
    setLoadWebView(false);
    setLink('');
    setIsWebViewLoading(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {!loadWebView ? (
        <View style={styles.centerWrapper}>
          <View style={styles.card}>
            <View style={styles.iconPlaceholder}>
              <Text style={styles.iconText}>🔗</Text>
            </View>
            <Text style={styles.title}>سیستم لینک ساز</Text>
            <Text style={styles.subtitle}>جهت ورود خودکار، لینک دسترسی را وارد کنید</Text>
            
            <TextInput
              style={styles.input}
              placeholder="https://..."
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
                <Text style={styles.buttonText}>اعمال تنظیمات و ورود</Text>
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
            <Text style={styles.headerTitle}>پروفایل کاربری</Text>
            <TouchableOpacity onPress={reloadWebView} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>↻ رفرش</Text>
            </TouchableOpacity>
          </View>
          
          {isWebViewLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.loadingText}>در حال بارگذاری فروشگاه...</Text>
            </View>
          )}

          <WebView
            ref={webviewRef}
            source={{ uri: 'https://www.okala.com/profile' }}
            injectedJavaScriptBeforeContentLoaded={injectedJS}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            cacheEnabled={false} // غیرفعال کردن کش برای جلوگیری از تداخل فریم‌ورک Next.js
            onLoadStart={() => setIsWebViewLoading(true)}
            onLoadEnd={() => setIsWebViewLoading(false)}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  centerWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: {
    backgroundColor: '#ffffff',
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    alignItems: 'center',
  },
  iconPlaceholder: { width: 60, height: 60, backgroundColor: '#e3f2fd', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  iconText: { fontSize: 28 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#7f8c8d', marginBottom: 24, textAlign: 'center' },
  input: {
    width: '100%', backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#dee2e6', borderRadius: 10,
    padding: 14, fontSize: 14, color: '#2c3e50', marginBottom: 20, textAlign: 'left'
  },
  button: {
    width: '100%', backgroundColor: '#3498db', paddingVertical: 14, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row'
  },
  buttonDisabled: { backgroundColor: '#95a5a6' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  statusText: { marginTop: 16, fontSize: 13, textAlign: 'center', fontWeight: '600' },
  errorText: { color: '#e74c3c' },
  successText: { color: '#27ae60' },
  
  webviewContainer: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#ffffff', paddingVertical: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#ecf0f1', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  headerTitle: { color: '#2c3e50', fontSize: 16, fontWeight: 'bold' },
  headerButton: { padding: 8, backgroundColor: '#f8f9fa', borderRadius: 8 },
  headerButtonText: { color: '#34495e', fontSize: 13, fontWeight: 'bold' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center', alignItems: 'center', zIndex: 10
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#7f8c8d', fontWeight: '600' }
});

export default App;
