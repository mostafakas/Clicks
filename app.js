import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let allProducts = []; 
let cart = JSON.parse(localStorage.getItem('cart')) || [];
const categoryNames = {
    'Laptops': 'لابتوبات', 'Mobiles': 'موبايلات', 'PC': 'كمبيوترات و PC', 
    'Accessories': 'إكسسوارات وقطع غيار', 'Services': 'صيانة'
};

window.updateCounters = () => {
    // حساب إجمالي القطع وليس فقط الأنواع
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cartCount').innerText = totalItems;
};
updateCounters();

// تحميل المنتجات مرة واحدة فقط لضمان سرعة التنقل
async function fetchAndBuildStore() {
    const querySnapshot = await getDocs(collection(db, "products"));
    querySnapshot.forEach((doc) => {
        allProducts.push({ id: doc.id, ...doc.data() });
    });
    
    // ترتيب من الأحدث
    allProducts.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
    
    document.getElementById('loadingState').style.display = 'none';
    buildStoreDOM();
}

function buildStoreDOM() {
    const container = document.getElementById('storeContent');
    container.innerHTML = '';
    
    Object.keys(categoryNames).forEach(cat => {
        const catProducts = allProducts.filter(p => p.category === cat);
        if(catProducts.length === 0) return;

        let cardsHtml = catProducts.map(p => `
            <div class="product-card" onclick="openProductDetails('${p.id}')">
                <img src="${p.image}" loading="lazy" class="product-img" onerror="this.src='https://via.placeholder.com/250'">
                <div class="product-brand">${p.brand || 'Clicks'}</div>
                <h4 class="product-title">${p.name}</h4>
                <div class="product-price">
                    <span class="current-price">${p.price.toLocaleString()} ج.م</span>
                </div>
                <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart('${p.id}')">
                    <i class="fas fa-cart-plus"></i> أضف للسلة
                </button>
            </div>
        `).join('');

        let html = `
        <div class="category-row" data-category="${cat}">
            <div class="category-header"><h3>${categoryNames[cat]}</h3></div>
            <div class="slider-container" id="container-${cat}">
                <button class="scroll-btn right" onclick="document.getElementById('track-${cat}').scrollBy({left: 300, behavior: 'smooth'})"><i class="fas fa-chevron-right"></i></button>
                <div class="slider-track" id="track-${cat}">
                    ${cardsHtml}
                </div>
                <button class="scroll-btn left" onclick="document.getElementById('track-${cat}').scrollBy({left: -300, behavior: 'smooth'})"><i class="fas fa-chevron-left"></i></button>
            </div>
        </div>`;
        container.innerHTML += html;
    });
}

// التنقل اللحظي بين الأقسام باستخدام CSS
document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const filter = btn.getAttribute('data-filter');
        document.querySelectorAll('.category-row').forEach(row => {
            row.style.display = (filter === 'all' || row.dataset.category === filter) ? 'block' : 'none';
            
            // تحويل العرض إلى Grid إذا كان قسم واحد، وإلى Slider إذا كان "الكل"
            const track = row.querySelector('.slider-track');
            const container = row.querySelector('.slider-container');
            if(filter === 'all') {
                track.classList.remove('grid-view');
                container.classList.remove('grid-view-active');
            } else {
                track.classList.add('grid-view');
                container.classList.add('grid-view-active');
            }
        });
    });
});

window.addToCart = (id) => {
    const p = allProducts.find(item => item.id === id);
    if(!p) return;

    let existingItem = cart.find(item => item.id === id);
    if(existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({ id: p.id, name: p.name, price: p.price, image: p.image, qty: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCounters();
    
    // أنيميشن صغير للسلة
    const badge = document.getElementById('cartCount');
    badge.style.transform = 'scale(1.5)';
    setTimeout(() => badge.style.transform = 'scale(1)', 200);

    closeDetailsModal();
    toggleCartModal(true);
};

window.updateCartQty = (id, change) => {
    let item = cart.find(i => i.id === id);
    if(item) {
        item.qty += change;
        if(item.qty <= 0) {
            cart = cart.filter(i => i.id !== id);
        }
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCounters();
    renderCart();
};

window.toggleCartModal = (show) => {
    document.getElementById('cartModal').style.display = show ? 'flex' : 'none';
    if(show) renderCart();
};

window.renderCart = () => {
    const container = document.getElementById('cartItemsContainer');
    const totalDiv = document.getElementById('cartTotalDisplay');
    const form = document.getElementById('checkoutForm');
    
    if (cart.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;"><i class="fas fa-shopping-cart fa-3x"></i><h3>السلة فارغة حالياً</h3></div>';
        totalDiv.style.display = 'none';
        form.style.display = 'none';
        return;
    }

    form.style.display = 'block';
    totalDiv.style.display = 'block';
    let html = '';
    let total = 0;
    
    cart.forEach(item => {
        html += `
            <div class="cart-item">
                <img src="${item.image}" class="cart-item-img">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.price.toLocaleString()} ج.م</div>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)">+</button>
                    <span class="qty-display">${item.qty}</span>
                    <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)">-</button>
                </div>
            </div>`;
        total += (item.price * item.qty);
    });
    
    container.innerHTML = html;
    totalDiv.innerHTML = `<div style="font-size:20px; font-weight:800; color:var(--dark);">الإجمالي المطلوب: <span style="color:var(--success); float:left;">${total.toLocaleString()} ج.م</span></div>`;
};

window.sendOrderToWebsite = async () => {
    const data = {
        name: document.getElementById('custName').value,
        phone: document.getElementById('custPhone').value,
        delivery: document.getElementById('deliveryMethod').value,
        address: document.getElementById('custAddress').value,
        payment: document.getElementById('paymentMethod').value
    };
    if(!data.name || !data.phone || !data.address) return alert("برجاء إكمال كافة البيانات");

    const btn = document.getElementById('btnWebsiteOrder');
    btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري التأكيد...`;

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const orderData = { customer: data, items: cart, totalAmount: total, status: "جديد", createdAt: new Date() };

    try {
        await addDoc(collection(db, "orders"), orderData);
        alert("🎉 تم تأكيد طلبك بنجاح! سيتم التواصل معك قريباً.");
        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCounters();
        toggleCartModal(false);
    } catch (error) { alert("حدث خطأ، حاول مرة أخرى."); } 
    finally { btn.disabled = false; btn.innerHTML = `<i class="fas fa-check-circle"></i> تأكيد الطلب`; }
};

window.openProductDetails = (id) => {
    const p = allProducts.find(item => item.id === id);
    if(!p) return;
    document.getElementById('detailsContainer').innerHTML = `
        <div style="flex:1; text-align:center; padding:20px;"><img src="${p.image}" style="max-width:100%; border-radius:15px;"></div>
        <div style="flex:1.5; padding:20px;">
            <div style="color:var(--primary); font-weight:800;">${p.brand || 'عام'}</div>
            <h2 style="font-size:24px; font-weight:800; margin-bottom:15px;">${p.name}</h2>
            <div style="font-size:28px; font-weight:800; color:var(--primary); margin-bottom:20px;">${p.price.toLocaleString()} ج.م</div>
            <p style="color:#475569; line-height:1.6; margin-bottom:20px; white-space:pre-line;">${p.description || 'لا يوجد وصف.'}</p>
            <button class="add-to-cart-btn" style="font-size:18px; padding:15px;" onclick="addToCart('${p.id}')">
                <i class="fas fa-shopping-bag"></i> أضف للسلة
            </button>
        </div>`;
    document.getElementById('productDetailsModal').style.display = 'flex';
};
window.closeDetailsModal = () => document.getElementById('productDetailsModal').style.display = 'none';

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDetailsModal(); toggleCartModal(false); } });

// البدء
fetchAndBuildStore();
