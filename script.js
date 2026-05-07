import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD07kWys5dp3f6FJeYblxMcAfQzY94MTtE",
    authDomain: "clicks-f7ce3.firebaseapp.com",
    projectId: "clicks-f7ce3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// جلب المنتجات
onSnapshot(query(collection(db, "products"), orderBy("createdAt", "desc")), (snapshot) => {
    products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderProducts(products);
});

// عرض المنتجات في الشبكة الرئيسية
function renderProducts(data) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = data.map(p => `
        <div class="p-card" onclick="openProductModal('${p.id}')">
            <img src="${p.image}" class="p-img">
            <h3 class="p-title">${p.name}</h3>
            <div class="p-price">${p.price.toLocaleString()} ج.م</div>
            <button class="btn-main" style="width:100%; margin-top:15px">عرض التفاصيل</button>
        </div>
    `).join('');
}

// وظيفة البوب أب (Product Modal)
window.openProductModal = (id) => {
    const p = products.find(x => x.id === id);
    const modal = document.getElementById('productModalOverlay');
    const body = document.getElementById('modalBody');
    
    body.innerHTML = `
        <div class="modal-gallery">
            <img src="${p.image}" class="modal-img">
        </div>
        <div class="modal-info">
            <h2>${p.name}</h2>
            <div class="modal-price">${p.price.toLocaleString()} ج.م</div>
            <p class="modal-desc">${p.description || 'لا يوجد وصف حالي لهذا المنتج.'}</p>
            <div class="specs" style="margin-bottom:20px">
                <p><strong>الماركة:</strong> ${p.brand || 'عام'}</p>
                <p><strong>الضمان:</strong> ${p.warranty || 'بدون ضمان'}</p>
            </div>
            <button class="btn-main" onclick="addToCart('${p.id}')" style="width:100%">إضافة للسلة <i class="fas fa-cart-plus"></i></button>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // منع التمرير في الخلفية
};

window.closeProductModal = () => {
    document.getElementById('productModalOverlay').style.display = 'none';
    document.body.style.overflow = 'auto';
};

// نظام البحث الذكي
document.getElementById('mainSearchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(term));
    renderProducts(filtered);
});

// فلاتر الأقسام
document.querySelectorAll('.cat-item').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        renderProducts(filter === 'all' ? products : products.filter(p => p.category === filter));
    });
});

// وظائف السلة
window.addToCart = (id) => {
    const p = products.find(x => x.id === id);
    cart.push(p);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    closeProductModal();
    toggleCart(true);
};

window.toggleCart = (show) => {
    document.getElementById('cartOverlay').classList.toggle('active', show);
};

function updateCartUI() {
    document.getElementById('cartBadge').innerText = cart.length;
    const content = document.getElementById('cartContent');
    let total = 0;
    
    content.innerHTML = cart.map((item, idx) => {
        total += item.price;
        return `
            <div class="cart-item" style="display:flex; gap:10px; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px">
                <img src="${item.image}" style="width:50px; height:50px; object-fit:contain">
                <div style="flex:1">
                    <p style="font-weight:700; font-size:14px">${item.name}</p>
                    <p style="color:var(--primary)">${item.price.toLocaleString()} ج.م</p>
                </div>
                <button onclick="removeFromCart(${idx})" style="border:none; color:red; background:none; cursor:pointer"><i class="fas fa-trash"></i></button>
            </div>
        `;
    }).join('');
    
    document.getElementById('cartTotal').innerText = total.toLocaleString();
}

window.removeFromCart = (idx) => {
    cart.splice(idx, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
};

window.confirmOrder = async () => {
    const name = document.getElementById('orderName').value;
    const phone = document.getElementById('orderPhone').value;
    if(!name || !phone) return alert('برجاء إدخال بياناتك');
    
    const orderData = {
        customer: { name, phone, address: document.getElementById('orderAddress').value },
        items: cart,
        total: cart.reduce((s, i) => s + i.price, 0),
        status: "جديد",
        createdAt: new Date()
    };
    
    try {
        await addDoc(collection(db, "orders"), orderData);
        alert('تم استلام طلبك بنجاح!');
        cart = []; localStorage.removeItem('cart');
        updateCartUI(); toggleCart(false);
    } catch(e) { alert('خطأ في الإرسال'); }
};

updateCartUI();
