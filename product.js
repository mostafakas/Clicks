import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD07kWys5dp3f6FJeYblxMcAfQzY94MTtE",
    authDomain: "clicks-f7ce3.firebaseapp.com",
    projectId: "clicks-f7ce3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');
const container = document.getElementById('productDetailsContainer');

if (!productId) {
    container.innerHTML = '<div style="width:100%; text-align:center; padding:100px; font-weight:800;">عذراً، المنتج غير موجود.</div>';
} else {
    getDoc(doc(db, "products", productId)).then(docSnap => {
        if (docSnap.exists()) {
            const p = docSnap.data();
            document.title = `${p.name} | Clicks`;
            
            const btnState = p.qty <= 0 ? 'disabled style="background:var(--text-muted);"' : '';

            container.innerHTML = `
                <div class="product-image-container">
                    <img src="${p.image}" alt="${p.name}">
                </div>
                <div class="product-info-container">
                    <h1>${p.name}</h1>
                    <div class="product-info-price">${p.price.toLocaleString()} ج.م</div>
                    
                    <div class="specs-grid">
                        <div class="spec-box"><span>الماركة</span><strong>${p.brand || 'غير محدد'}</strong></div>
                        <div class="spec-box"><span>رقم الموديل (SKU)</span><strong>${p.sku || 'غير محدد'}</strong></div>
                        <div class="spec-box"><span>الحالة</span><strong>${p.condition || 'جديد'}</strong></div>
                        <div class="spec-box"><span>الضمان</span><strong>${p.warranty || 'بدون ضمان'}</strong></div>
                    </div>
                    
                    <p style="font-size:15px; color:var(--text-muted); line-height:1.8; margin-bottom:30px;">
                        ${p.description || 'لا يوجد وصف متاح لهذا المنتج حالياً.'}
                    </p>
                    
                    <div class="pd-action-bar">
                        <div class="card-qty-control">
                            <button onclick="changeLocalQty(this, -1)">-</button>
                            <input type="number" value="1" readonly>
                            <button onclick="changeLocalQty(this, 1)">+</button>
                        </div>
                        <button class="add-to-cart-btn" style="flex:1;" onclick="addToCartAction('${docSnap.id}', '${p.name.replace(/'/g, "\\'")}', ${p.price}, '${p.image}', this)" ${btnState}>
                            ${p.qty > 0 ? 'إضافة إلى السلة <i class="fas fa-shopping-cart"></i>' : 'عذراً، نفذت الكمية'}
                        </button>
                    </div>
                </div>`;
        }
    });
}