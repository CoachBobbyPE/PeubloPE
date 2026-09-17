
const CACHE='pueblo-pe-arcade-22-0';
const ASSETS=[
  './','./index.html','./styles.css','./app.js','./config.js','./manifest.webmanifest',
  './assets/home_duo.png','./assets/coach_guide.png','./assets/coach_triumph.png',
  './assets/spike_highfive.png','./assets/spike_cheer.png','./assets/coach_flex.png',
  './assets/icon-192.png','./assets/icon-512.png'
  ,'./assets/ftb_bobby.png','./assets/ftb_spike.png','./assets/ftb_puppy_squad.png'
  ,'./assets/ftb_bulldog_students.png','./assets/ftb_student_1.png','./assets/ftb_student_2.png','./assets/ftb_gym.png'
  ,'./assets/ftb_spike_avatar.png'
  ,'./assets/module_fitt.png','./assets/module_rescue.png','./assets/module_rally.png'
  ,'./assets/module_grip.png','./assets/module_volley.png','./assets/module_rotation.png'
  ,'./assets/ui_home_team.png','./assets/ui_fitness_menu.png','./assets/ui_badminton_menu.png'
  ,'./assets/ui_volleyball_menu.png','./assets/ui_spike_reward.png','./assets/ui_module_complete.png'
  ,'./assets/art_home_bobby_spike_v2.png','./assets/art_arena_fitness_v2.png','./assets/art_arena_badminton_v2.png','./assets/art_arena_volleyball_v2.png'
  ,'./assets/art_module_fitt_v2.png','./assets/art_module_rescue_v2.png','./assets/art_module_rally_v2.png'
  ,'./assets/art_module_grip_v2.png','./assets/art_module_volley_v2.png','./assets/art_module_rotation_v2.png'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
    const copy=res.clone();
    caches.open(CACHE).then(c=>c.put(e.request,copy));
    return res;
  }).catch(()=>caches.match('./index.html'))));
});
