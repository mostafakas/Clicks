import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD07kWys5dp3f6FJeYblxMcAfQzY94MTtE",
    authDomain: "clicks-f7ce3.firebaseapp.com",
    projectId: "clicks-f7ce3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let allProducts = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// === دوال سلة المشتريات (Drawer) والتعديل اللحظي ===
window.updateCartCounters = () => {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(b => b.innerText = totalItems);
};
window.updateCartCounters();

window.toggleCartDrawer = (show) => {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if(drawer && overlay) {
        if(show) {
            drawer.classList.add('active');
            overlay.classList.add('active');
            window.renderCartDrawer();
        } else {
            drawer.classList.remove('active');
            overlay.classList.remove('active');
        }
    }
};

// تفعيل زر ESC للغلق
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.toggleCartDrawer(false);
});

// حفظ السكرول للرجوع لنفس المكان
document.addEventListener('DOMContentLoaded', () => {
    const savedScroll = sessionStorage.getItem('scrollPos');
    if (savedScroll && document.getElementById('storeContainer')) {
        setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 100);
    }
});
window.addEventListener('scroll', () => {
    if(document.getElementById('storeContainer')) sessionStorage.setItem('scrollPos', window.scrollY);
});

// === دالة بناء السلة الحية ===
window.renderCartDrawer = () => {
    const container = document.getElementById('cartItemsContainer');
    const totalBox = document.getElementById('cartTotalDisplay');
    const form = document.getElementById('checkoutForm');
    
    if(!container) return;

    if(cart.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 40px 20px; color:var(--text-muted);">
            <i class="fas fa-shopping-basket fa-3x" style="margin-bottom:15px; opacity:0.5;"></i>
            <h3>السلة فارغة حالياً</h3>
        </div>`;
        totalBox.style.display = 'none';
        form.style.display = 'none';
        return;
    }

    form.style.display = 'block';
    totalBox.style.display = 'flex';
    
    let html = '';
    let totalPrice = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        totalPrice += itemTotal;
        html += `
            <div class="cart-item">
                <button class="delete-item-btn" onclick="window.removeCartItem(${index})"><i class="fas fa-trash"></i></button>
                <img src="${item.image}" class="cart-item-img">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.price.toLocaleString()} ج.م</div>
                    <div class="cart-live-qty">
                        <button onclick="window.updateLiveQty(${index}, -1)">-</button>
                        <input type="number" value="${item.qty}" readonly>
                        <button onclick="window.updateLiveQty(${index}, 1)">+</button>
                    </div>
                </div>
            </div>`;
    });

    container.innerHTML = html;
    document.getElementById('cartTotalPrice').innerText = `${totalPrice.toLocaleString()} ج.م`;
};

// تعديل الكمية لحظياً داخل السلة
window.updateLiveQty = (index, change) => {
    cart[index].qty += change;
    if(cart[index].qty < 1) cart[index].qty = 1;
    localStorage.setItem('cart', JSON.stringify(cart));
    window.renderCartDrawer();
    window.updateCartCounters();
};

window.removeCartItem = (index) => {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    window.renderCartDrawer();
    window.updateCartCounters();
};

// التحكم في كمية الكرت قبل الإضافة
window.changeLocalQty = (btn, change) => {
    const input = btn.parentElement.querySelector('input');
    let val = parseInt(input.value) + change;
    if(val < 1) val = 1;
    input.value = val;
};

// الإضافة للسلة من الكروت
window.addToCartAction = (id, name, price, image, btnContext) => {
    const qtyInput = btnContext.parentElement.querySelector('input[type="number"]');
    const qty = parseInt(qtyInput.value) || 1;

    const existing = cart.find(i => i.id === id);
    if(existing) {
        existing.qty += qty;
    } else {
        cart.push({ id, name, price, image, qty });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    window.updateCartCounters();
    qtyInput.value = 1; // إرجاع العداد لـ 1
    
    // إظهار السلة كـ تأكيد بصري
    window.toggleCartDrawer(true);
};

// === جلب ועرض المنتجات (في الرئيسية) ===
const storeContainer = document.getElementById('storeContainer');
if(storeContainer) {
    const productsRef = collection(db, "products");
    
    onSnapshot(query(productsRef, orderBy("createdAt", "desc")), (snapshot) => {
        allProducts = [];
        snapshot.forEach(doc => { allProducts.push({ id: doc.id, ...doc.data() }); });
        renderStore(allProducts, 'all');
    });

    const renderStore = (productsData, filterType) => {
        storeContainer.innerHTML = '';
        if(productsData.length === 0) {
            storeContainer.innerHTML = `<div style="text-align:center; padding:50px; font-weight:800; color:var(--text-muted);">لا توجد نتائج مطابقة.</div>`;
            return;
        }

        if(filterType === 'all') {
            const categories = [
                { id: 'Mobiles', name: 'الهواتف الذكية' },
                { id: 'Laptops', name: 'أجهزة اللابتوب' },
                { id: 'PC', name: 'أجهزة الكمبيوتر' },
                { id: 'Accessories', name: 'الإكسسوارات' }
            ];

            categories.forEach((cat, index) => {
                const catProducts = productsData.filter(p => p.category === cat.id);
                if(catProducts.length > 0) {
                    storeContainer.innerHTML += buildRowSection(cat.name, catProducts, index);
                }
            });
        } else {
            // عرض شبكي للبحث أو فلتر محدد
            let catTitle = document.querySelector(`.cat-btn[data-filter="${filterType}"]`)?.innerText || 'نتائج البحث';
            storeContainer.innerHTML = `
                <div class="category-section">
                    <div class="section-header"><h2 class="section-title">${catTitle}</h2></div>
                    <div class="search-results-grid">${buildCardsHTML(productsData)}</div>
                </div>`;
        }
    };

    const buildRowSection = (title, products, index) => {
        const rowId = `scrollRow-${index}`;
        return `
            <div class="category-section">
                <div class="section-header">
                    <h2 class="section-title">${title}</h2>
                </div>
                <div class="scroller-wrapper">
                    <button class="scroll-arrow scroll-right" onclick="scrollH('${rowId}', 1)"><i class="fas fa-chevron-right"></i></button>
                    <button class="scroll-arrow scroll-left" onclick="scrollH('${rowId}', -1)"><i class="fas fa-chevron-left"></i></button>
                    <div class="products-row" id="${rowId}">
                        ${buildCardsHTML(products)}
                    </div>
                </div>
            </div>`;
    };

    const buildCardsHTML = (products) => {
        let html = '';
        products.forEach(p => {
            let badge = (p.oldPrice && p.oldPrice > p.price) ? `<div class="discount-badge">خصم ${Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)}%</div>` : '';
            html += `
                <div class="product-card">
                    ${badge}
                    <a href="product.html?id=${p.id}"><img src="${p.image}" class="product-img"></a>
                    <a href="product.html?id=${p.id}"><div class="product-name">${p.name}</div></a>
                    <div class="product-price">
                        ${p.price.toLocaleString()} ج.م
                        ${p.oldPrice ? `<span class="product-old-price">${p.oldPrice.toLocaleString()} ج.م</span>` : ''}
                    </div>
                    <div class="card-actions">
                        <div class="card-qty-control">
                            <button onclick="changeLocalQty(this, -1)">-</button>
                            <input type="number" value="1" readonly>
                            <button onclick="changeLocalQty(this, 1)">+</button>
                        </div>
                        <button class="add-to-cart-btn" onclick="addToCartAction('${p.id}', '${p.name.replace(/'/g, "\\'")}', ${p.price}, '${p.image}', this)">
                            <i class="fas fa-cart-plus"></i>
                        </button>
                    </div>
                </div>`;
        });
        return html;
    };

    window.scrollH = (rowId, dir) => {
        const row = document.getElementById(rowId);
        // Scroll amount based on average card width
        row.scrollBy({ left: dir * 250, behavior: 'smooth' }); 
    };

    // فلاتر الأقسام
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');
            renderStore(filter === 'all' ? allProducts : allProducts.filter(p => p.category === filter), filter);
        });
    });

    // البحث (مربوط بالـ Desktop و Mobile)
    const handleSearch = (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
        renderStore(filtered, 'search');
    };
    document.getElementById('searchInputDesk')?.addEventListener('input', handleSearch);
    document.getElementById('searchInputMob')?.addEventListener('input', handleSearch);
}

// === إرسال الطلب عبر الموقع ===
window.sendOrderToWebsite = async () => {
    const data = {
        name: document.getElementById('custName').value,
        phone: document.getElementById('custPhone').value,
        address: document.getElementById('custAddress').value,
        delivery: document.getElementById('deliveryMethod').value,
        payment: document.getElementById('paymentMethod').value
    };
    
    if(!data.name || !data.phone || !data.address) return alert("برجاء إكمال البيانات بشكل صحيح.");

    const btn = document.getElementById('btnWebsiteOrder');
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري تأكيد الطلب...`;

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const orderData = { customer: data, items: cart, totalAmount: total, status: "جديد", createdAt: new Date() };

    try {
        await addDoc(collection(db, "orders"), orderData);
        alert("🎉 تم تسجيل طلبك بنجاح. سيتم التواصل معك لتأكيد الشحن.");
        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        window.updateCartCounters();
        window.toggleCartDrawer(false);
    } catch (error) {
        alert("عذراً، حدث خطأ أثناء إرسال الطلب.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `تأكيد الطلب الآن`;
    }
};