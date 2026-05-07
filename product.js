import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD07kWys5dp3f6FJeYblxMcAfQzY94MTtE",
    authDomain: "clicks-f7ce3.firebaseapp.com",
    projectId: "clicks-f7ce3",
    storageBucket: "clicks-f7ce3.firebasestorage.app",
    messagingSenderId: "628318172493",
    appId: "1:628318172493:web:e5437bde78399b6fbaf304"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// قراءة الـ ID من الرابط الخاص بالصفحة
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');
const container = document.getElementById('productDetailsContainer');

if (!productId) {
    container.innerHTML = '<div style="width:100%; text-align:center; padding:50px; font-weight:700;">المنتج غير موجود. <a href="index.html" style="color:var(--accent);">العودة للرئيسية</a></div>';
} else {
    getDoc(doc(db, "products", productId)).then(docSnap => {
        if (docSnap.exists()) {
            const p = docSnap.data();
            document.title = `${p.name} | Clicks`;
            
            const statusHtml = p.qty > 0 ? `<span style="color:var(--success);"><i class="fas fa-check-circle"></i> متوفر</span>` : `<span style="color:var(--danger);"><i class="fas fa-times-circle"></i> غير متوفر</span>`;
            const btnState = p.qty <= 0 ? 'disabled style="background:var(--text-light); cursor:not-allowed;"' : '';
            const oldPriceHtml = p.oldPrice ? `<span class="pd-old-price">${p.oldPrice.toLocaleString()} ج.م</span>` : '';

            container.innerHTML = `
                <div class="product-gallery">
                    <img src="${p.image}" alt="${p.name}">
                </div>
                <div class="product-details">
                    <div class="pd-brand">${p.brand || 'Clicks'}</div>
                    <h1 class="pd-title">${p.name}</h1>
                    <div class="pd-price">${p.price.toLocaleString()} ج.م ${oldPriceHtml}</div>
                    
                    <div class="pd-specs">
                        <div class="spec-box"><div class="spec-label">الموديل (SKU)</div><div class="spec-val">${p.sku || 'غير محدد'}</div></div>
                        <div class="spec-box"><div class="spec-label">الحالة</div><div class="spec-val">${p.condition || 'جديد'}</div></div>
                        <div class="spec-box"><div class="spec-label">الضمان</div><div class="spec-val">${p.warranty || 'بدون ضمان'}</div></div>
                        <div class="spec-box"><div class="spec-label">التوفر</div><div class="spec-val">${statusHtml}</div></div>
                    </div>
                    
                    <div class="pd-desc">${p.description || 'لا يوجد وصف تفصيلي متاح حالياً.'}</div>
                    
                    <button class="pd-btn" onclick="window.addToCart('${docSnap.id}', '${p.name.replace(/'/g, "\\'")}', ${p.price}, '${p.image}')" ${btnState}>
                        <i class="fas fa-shopping-bag"></i> ${p.qty > 0 ? 'إضافة إلى السلة' : 'نفذت الكمية'}
                    </button>
                </div>`;
        } else {
            container.innerHTML = '<div style="width:100%; text-align:center; padding:50px; font-weight:700;">عذراً، هذا المنتج غير موجود بقاعدة البيانات.</div>';
        }
    }).catch(err => {
        container.innerHTML = '<div style="width:100%; text-align:center; padding:50px; font-weight:700; color:var(--danger);">حدث خطأ أثناء تحميل البيانات من الخادم.</div>';
    });
}