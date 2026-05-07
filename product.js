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
    container.innerHTML = '<div style="text-align:center; padding:50px; font-weight:800; width:100%;">المنتج غير موجود. <a href="index.html" style="color:var(--accent);">العودة</a></div>';
} else {
    getDoc(doc(db, "products", productId)).then(docSnap => {
        if (docSnap.exists()) {
            const p = docSnap.data();
            document.title = `${p.name} | Clicks`;
            
            const btnState = p.qty <= 0 ? 'disabled style="background:var(--text-light);"' : '';

            container.innerHTML = `
                <div class="product-gallery">
                    <img src="${p.image}" alt="${p.name}">
                </div>
                <div class="product-details">
                    <h1>${p.name}</h1>
                    <div class="pd-price">${p.price.toLocaleString()} ج.م</div>
                    
                    <div class="pd-specs">
                        <div class="spec-item"><span class="spec-label">الموديل (SKU)</span><span>${p.sku || 'غير محدد'}</span></div>
                        <div class="spec-item"><span class="spec-label">الحالة</span><span>${p.condition || 'جديد'}</span></div>
                        <div class="spec-item"><span class="spec-label">الضمان</span><span>${p.warranty || 'بدون'}</span></div>
                    </div>
                    
                    <div class="pd-controls">
                        <div class="qty-selector">
                            <button class="qty-btn" onclick="changeLocalQty(this, -1)">-</button>
                            <input type="number" class="qty-input" value="1" min="1" readonly>
                            <button class="qty-btn" onclick="changeLocalQty(this, 1)">+</button>
                        </div>
                        <button class="add-btn" onclick="addToCartAnimated(event, '${docSnap.id}', '${p.name.replace(/'/g, "\\'")}', ${p.price}, '${p.image}')" ${btnState}>
                            ${p.qty > 0 ? 'إضافة إلى السلة <i class="fas fa-shopping-bag"></i>' : 'نفذت الكمية'}
                        </button>
                    </div>
                </div>`;
        }
    });
}
