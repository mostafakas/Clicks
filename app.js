import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

window.updateCounters = () => {
    document.getElementById('cartCount').innerText = cart.length;
};
updateCounters();

// تفعيل زر ESC لإغلاق النوافذ
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeDetailsModal();
        toggleCartModal(false);
    }
});

const productsRef = collection(db, "products");
onSnapshot(query(productsRef, orderBy("createdAt", "desc")), (snapshot) => {
    allProducts = [];
    snapshot.forEach(doc => { allProducts.push({ id: doc.id, ...doc.data() }); });
    renderProducts(allProducts);
});

window.renderProducts = (productsArray) => {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = "";
    if (productsArray.length === 0) {
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-frown-open"></i><h3>عذراً، لا يوجد منتجات في هذا القسم حالياً.</h3></div>`;
        return;
    }

    productsArray.forEach(p => {
        let discountHtml = p.oldPrice && p.oldPrice > p.price ? `<div class="discount-badge">خصم ${Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)}%</div>` : '';
        grid.innerHTML += `
            <div class="product-card" onclick="openProductDetails('${p.id}')">
                ${discountHtml}
                <img src="${p.image}" class="product-img" onerror="this.src='https://via.placeholder.com/250'">
                <div class="product-brand">${p.brand || 'Clicks'}</div>
                <h4 class="product-title">${p.name}</h4>
                <div class="product-price">
                    <span class="current-price">${p.price.toLocaleString()} ج.م</span>
                    ${p.oldPrice ? `<span class="old-price">${p.oldPrice.toLocaleString()}</span>` : ''}
                </div>
                <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart('${p.id}')">
                    <i class="fas fa-cart-plus"></i> أضف للسلة
                </button>
            </div>`;
    });
};

document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('sectionTitle').innerText = btn.innerText;
        const filter = btn.getAttribute('data-filter');
        renderProducts(filter === 'all' ? allProducts : allProducts.filter(p => p.category === filter));
    });
});

document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-filter="all"]').classList.add('active');
    document.getElementById('sectionTitle').innerText = "نتائج البحث";
    renderProducts(allProducts.filter(p => p.name.toLowerCase().includes(term) || (p.brand && p.brand.toLowerCase().includes(term))));
});

window.openProductDetails = (id) => {
    const p = allProducts.find(item => item.id === id);
    if(!p) return;
    const statusBadge = p.qty > 0 ? `<span style="color:var(--success);"><i class="fas fa-check-circle"></i> متوفر</span>` : `<span style="color:var(--danger);"><i class="fas fa-times-circle"></i> نفذت الكمية</span>`;

    document.getElementById('detailsContainer').innerHTML = `
        <div class="details-img-col"><img src="${p.image}"></div>
        <div class="details-info-col">
            <div style="color:var(--primary); font-weight:800; margin-bottom:10px;">${p.brand || 'عام'}</div>
            <h2 class="details-title">${p.name}</h2>
            <div class="details-price">${p.price.toLocaleString()} ج.م ${p.oldPrice ? `<span style="font-size:18px; color:#94a3b8; text-decoration:line-through;">${p.oldPrice.toLocaleString()} ج.م</span>` : ''}</div>
            <div class="specs-grid">
                <div class="spec-item"><span class="spec-label">الموديل (SKU)</span><span class="spec-value">${p.sku || 'N/A'}</span></div>
                <div class="spec-item"><span class="spec-label">الحالة</span><span class="spec-value">${p.condition || 'جديد'}</span></div>
                <div class="spec-item"><span class="spec-label">الضمان</span><span class="spec-value">${p.warranty || 'بدون'}</span></div>
                <div class="spec-item"><span class="spec-label">التوفر</span><span class="spec-value">${statusBadge}</span></div>
            </div>
            <div class="details-desc">${p.description || 'لا يوجد وصف.'}</div>
            <button class="add-to-cart-btn" style="background:var(--primary); color:white; font-size:18px;" 
                    onclick="addToCart('${p.id}')" ${p.qty <= 0 ? 'disabled style="background:var(--secondary);"' : ''}>
                <i class="fas fa-shopping-bag"></i> ${p.qty > 0 ? 'أضف للسلة' : 'غير متوفر'}
            </button>
        </div>`;
    document.getElementById('productDetailsModal').style.display = 'flex';
};

window.closeDetailsModal = () => document.getElementById('productDetailsModal').style.display = 'none';

window.addToCart = (id) => {
    const p = allProducts.find(item => item.id === id);
    if(!p) return;

    cart.push({ id: p.id, name: p.name, price: p.price, image: p.image });
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCounters();
    
    const badge = document.getElementById('cartCount');
    badge.style.transform = 'scale(1.5)';
    setTimeout(() => badge.style.transform = 'scale(1)', 200);

    closeDetailsModal();
    toggleCartModal(true);
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
        container.innerHTML = '<div class="empty-state" style="padding:20px;"><i class="fas fa-shopping-cart"></i><h3>السلة فارغة حالياً</h3></div>';
        totalDiv.style.display = 'none';
        form.style.display = 'none';
        return;
    }

    form.style.display = 'block';
    totalDiv.style.display = 'block';
    let html = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        html += `
            <div class="cart-item">
                <img src="${item.image || 'https://via.placeholder.com/100'}" class="cart-item-img">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.price.toLocaleString()} ج.م</div>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${index})"><i class="fas fa-trash-alt"></i></button>
            </div>`;
        total += item.price;
    });
    
    container.innerHTML = html;
    totalDiv.innerHTML = `
        <div class="cart-total-amount">
            الإجمالي المطلوب: <span>${total.toLocaleString()} ج.م</span>
        </div>
        <span class="cart-shipping-note">
            <i class="fas fa-info-circle"></i> تنويه: الإجمالي لا يشمل رسوم خدمة التوصيل (في حالة اختيار التوصيل للعنوان)
        </span>`;
};

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCounters();
    renderCart();
};

const validateForm = () => {
    const data = {
        name: document.getElementById('custName').value,
        phone: document.getElementById('custPhone').value,
        delivery: document.getElementById('deliveryMethod').value,
        address: document.getElementById('custAddress').value,
        payment: document.getElementById('paymentMethod').value
    };
    if(!data.name || !data.phone || !data.address) {
        alert("برجاء إكمال كافة بيانات العميل لضمان وصول الطلب.");
        return null;
    }
    return data;
};

window.sendOrderToWhatsApp = () => {
    const customer = validateForm();
    if(!customer) return;

    let productsText = ""; let total = 0;
    cart.forEach((item, i) => {
        productsText += `🛍️ *${i+1}. ${item.name}* - ${item.price.toLocaleString()} ج.م%0A`;
        total += item.price;
    });

    const message = `*🌟 طلب جديد من متجر Clicks 🌟*%0A` +
                    `━━━━━━━━━━━━━━━━━━%0A` +
                    `*📦 المنتجات:*%0A${productsText}` +
                    `━━━━━━━━━━━━━━━━━━%0A` +
                    `*💰 الإجمالي (بدون الشحن):* ${total.toLocaleString()} ج.م%0A` +
                    `━━━━━━━━━━━━━━━━━━%0A` +
                    `*👤 بيانات العميل:*%0A` +
                    `▪️ الاسم: ${customer.name}%0A` +
                    `▪️ الموبايل: ${customer.phone}%0A` +
                    `▪️ طريقة الاستلام: ${customer.delivery}%0A` +
                    `▪️ العنوان: ${customer.address}%0A` +
                    `▪️ وسيلة الدفع: ${customer.payment}%0A%0A` +
                    `_تم الطلب عبر الموقع الإلكتروني_`;

    window.open(`https://wa.me/201061890015?text=${message}`, '_blank');
};

window.sendOrderToWebsite = async () => {
    const customer = validateForm();
    if(!customer) return;

    const btn = document.getElementById('btnWebsiteOrder');
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...`;

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const orderData = {
        customer,
        items: cart,
        totalAmount: total,
        status: "جديد", 
        createdAt: new Date()
    };

    try {
        await addDoc(collection(db, "orders"), orderData);
        alert("🎉 تم استلام طلبك بنجاح! سيتم التواصل معك قريباً لتأكيد الطلب.");
        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCounters();
        toggleCartModal(false);
    } catch (error) {
        alert("حدث خطأ في الشبكة، برجاء المحاولة لاحقاً أو الطلب عبر واتساب.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-globe"></i> تأكيد الطلب عبر الموقع`;
    }
};