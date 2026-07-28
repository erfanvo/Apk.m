import React, { useState, useRef } from 'react';
import { View, TextInput, Button, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import CookieManager from '@react-native-cookies/cookies';

const App = () => {
  const [link, setLink] = useState('');
  const [status, setStatus] = useState('');
  const [isInjecting, setIsInjecting] = useState(false);
  const [loadWebView, setLoadWebView] = useState(false);
  const [injectedJS, setInjectedJS] = useState('');
  const webviewRef = useRef(null);

  const handleInject = async () => {
    if (!link) {
      setStatus('خطا: لینک ورودی معتبر نمی‌باشد.');
      return;
    }

    setIsInjecting(true);
    setStatus('در حال ارتباط با سرور و دریافت داده‌های احراز هویت...');
    setLoadWebView(false);

    try {
      const response = await fetch(link);
      const data = await response.json();

      if (!data || !data.origins) {
        throw new Error('ساختار داده دریافتی نامعتبر است.');
      }

      setStatus('در حال پاکسازی نشست‌های قبلی و پیکربندی کوکی‌ها...');

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
          name: 'tokenMS',
          value: tokenMsValue,
          domain: '.okala.com',
          path: '/',
          secure: true,
        });
      }

      if (refreshValue) {
        await CookieManager.set('https://www.okala.com', {
          name: 'refresh_token',
          value: refreshValue,
          domain: '.okala.com',
          path: '/',
          secure: true,
        });
      }

      const jsCode = `
        localStorage.clear();
        sessionStorage.clear();
        ${localStorageItems.map(item => `localStorage.setItem('${item.name}', '${item.value}');`).join('\n')}
        true;
      `;
      setInjectedJS(jsCode);

      setStatus('تزریق موفقیت‌آمیز. در حال بارگذاری سیستم مقصد...');
      setLoadWebView(true);
      setIsInjecting(false);

    } catch (error) {
      setStatus('خطای سیستمی: ' + error.message);
      setIsInjecting(false);
    }
  };

  return (
    <View style={styles.container}>
      {!loadWebView ? (
        <View style={styles.formContainer}>
          <Text style={styles.title}>سیستم لینک ساز</Text>
          <TextInput
            style={styles.input}
            placeholder="لینک دسترسی را وارد نمایید"
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
          />
          <Button title="اعمال تنظیمات و ورود" onPress={handleInject} disabled={isInjecting} color="#2c3e50" />
          
          {isInjecting && <ActivityIndicator size="small" color="#2c3e50" style={{ marginTop: 20 }} />}
          <Text style={styles.statusText}>{status}</Text>
        </View>
      ) : (
        <WebView
          ref={webviewRef}
          source={{ uri: 'https://www.okala.com' }}
          injectedJavaScriptBeforeContentLoaded={injectedJS}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          style={{ flex: 1 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  formContainer: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#2c3e50' },
  input: { borderWidth: 1, borderColor: '#bdc3c7', padding: 12, marginBottom: 15, borderRadius: 5, backgroundColor: '#fff' },
  statusText: { marginTop: 20, textAlign: 'center', color: '#e74c3c', fontWeight: 'bold' }
});

export default App;
