import Vue from 'vue';
import App from './App';

Vue.config.productionTip = false;
if (!Vue.prototype.$showColorSeedDialog) {
  Vue.prototype.$showColorSeedDialog = () => void 0;
}
if (!Vue.prototype.$showSaveImageDialog) {
  Vue.prototype.$showSaveImageDialog = () => void 0;
}

new Vue({
  render: h => h(App),
}).$mount('#app');
