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

// إعدادات السلة العامة للموقع
window.updateCounters = () => {
    const counts = document.querySelectorAll('.cart-badge');
    counts.forEach(el => el.innerText = cart.length);
};
window.updateCounters();

window.toggleCartModal = (show) => {
    const modal = document.getElementById('cartModal');
    if(modal) {
        modal.style.display = show ? 'flex' : 'none';
        if(show) window.renderCart();
    }
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.toggleCartModal(false);
});

// منطق جلب وعرض المنتجات (يعمل فقط إذا كان الـ Container موجود)
const storeContainer = document.getElementById('storeContainer');
if(storeContainer) {
    const productsRef = collection(db, "products");
    
    onSnapshot(query(productsRef, orderBy("createdAt", "desc")), (snapshot) => {
        allProducts = [];
        snapshot.forEach(doc => { allProducts.push({ id: doc.id, ...doc.data() }); });
        renderProducts(allProducts, 'all');
    });

    const renderProducts = (productsArray, filterType) => {
        storeContainer.innerHTML = '';
        
        if (productsArray.length === 0) {
            storeContainer.innerHTML = `<div style="text-align:center; padding: 50px; color:var(--text-light); font-weight:600;">لا توجد منتجات حالياً.</div>`;
            return;
        }

        // لو تم اختيار "الكل"، نعرض السيكشنات تحت بعضها
        if (filterType === 'all') {
            const categories = [
                { id: 'Mobiles', name: 'موبايلات' },
                { id: 'Laptops', name: 'لابتوبات' },
                { id: 'PC', name: 'كمبيوترات و PC' },
                { id: 'Accessories', name: 'إكسسوارات وقطع غيار' },
                { id: 'Services', name: 'صيانة' }
            ];

            categories.forEach(cat => {
                const catProducts = productsArray.filter(p => p.category === cat.id);
                if(catProducts.length > 0) {
                    storeContainer.innerHTML += buildCategorySection(cat.name, catProducts);
                }
            });
        } else {
            // لو تم اختيار قسم محدد، نعرضه لوحده
            let catName = document.querySelector(`.cat-btn[data-filter="${filterType}"]`)?.innerText || 'نتائج البحث';
            storeContainer.innerHTML = buildCategorySection(catName, productsArray);
        }
    };

    const buildCategorySection = (title, products) => {
        let html = `<div class="category-section">
                        <h2 class="category-title">${title}</h2>
                        <div class="products-grid">`;
        
        products.forEach(p => {
            let discountHtml = (p.oldPrice && p.oldPrice > p.price) ? `<div class="discount-badge">خصم ${Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)}%</div>` : '';
            html += `
                <a href="product.html?id=${p.id}" class="product-card">
                    ${discountHtml}
                    <img src="${p.image}" class="product-img" onerror="this.src='https://via.placeholder.com/250'">
                    <div class="product-brand">${p.brand || 'Clicks'}</div>
                    <h4 class="product-name">${p.name}</h4>
                    <div class="product-price">
                        ${p.price.toLocaleString()} ج.م 
                        ${p.oldPrice ? `<span class="old-price">${p.oldPrice.toLocaleString()}</span>` : ''}
                    </div>
                    <button class="add-cart-btn" onclick="event.preventDefault(); window.addToCart('${p.id}', '${p.name.replace(/'/g, "\\'")}', ${p.price}, '${p.image}')">
                        <i class="fas fa-cart-plus"></i> أضف للسلة
                    </button>
                </a>`;
        });
        html += `</div></div>`;
        return html;
    };

    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');
            renderProducts(filter === 'all' ? allProducts : allProducts.filter(p => p.category === filter), filter);
        });
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term) || (p.brand && p.brand.toLowerCase().includes(term)));
        renderProducts(filtered, 'search');
    });
}

// التحكم وإدارة السلة
window.addToCart = (id, name, price, image) => {
    cart.push({ id, name, price, image });
    localStorage.setItem('cart', JSON.stringify(cart));
    window.updateCounters();
    window.toggleCartModal(true);
};

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    window.updateCounters();
    window.renderCart();
};

window.renderCart = () => {
    const container = document.getElementById('cartItemsContainer');
    const totalDiv = document.getElementById('cartTotalDisplay');
    const form = document.getElementById('checkoutForm');
    
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-light); font-weight:600;">السلة فارغة حالياً</div>';
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
                <img src="${item.image || 'https://via.placeholder.com/100'}">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.price.toLocaleString()} ج.م</div>
                </div>
                <button class="remove-btn" onclick="window.removeFromCart(${index})"><i class="fas fa-trash"></i></button>
            </div>`;
        total += item.price;
    });
    
    container.innerHTML = html;
    totalDiv.innerHTML = `الإجمالي المطلوب: ${total.toLocaleString()} ج.م`;
};

// وظائف تأكيد الطلب
const validateForm = () => {
    const data = {
        name: document.getElementById('custName').value,
        phone: document.getElementById('custPhone').value,
        delivery: document.getElementById('deliveryMethod').value,
        address: document.getElementById('custAddress').value,
        payment: document.getElementById('paymentMethod').value
    };
    if(!data.name || !data.phone || !data.address) {
        alert("برجاء إكمال كافة بيانات العميل.");
        return null;
    }
    return data;
};

window.sendOrderToWhatsApp = () => {
    const customer = validateForm();
    if(!customer) return;

    let productsText = ""; let total = 0;
    cart.forEach((item, i) => {
        productsText += `🛍️ ${i+1}. ${item.name} - ${item.price.toLocaleString()} ج.م%0A`;
        total += item.price;
    });

    const message = `*طلب جديد من المتجر*%0A` +
                    `المنتجات:%0A${productsText}` +
                    `الإجمالي: ${total.toLocaleString()} ج.م%0A` +
                    `الاسم: ${customer.name}%0Aالموبايل: ${customer.phone}%0Aالعنوان: ${customer.address}%0Aالاستلام: ${customer.delivery}%0Aالدفع: ${customer.payment}`;

    window.open(`https://wa.me/201061890015?text=${message}`, '_blank');
};

window.sendOrderToWebsite = async () => {
    const customer = validateForm();
    if(!customer) return;

    const btn = document.getElementById('btnWebsiteOrder');
    btn.disabled = true;
    btn.innerHTML = `جاري الإرسال...`;

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const orderData = { customer, items: cart, totalAmount: total, status: "جديد", createdAt: new Date() };

    try {
        await addDoc(collection(db, "orders"), orderData);
        alert("تم استلام طلبك بنجاح وسنتواصل معك قريباً.");
        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        window.updateCounters();
        window.toggleCartModal(false);
    } catch (error) {
        alert("حدث خطأ في الشبكة، برجاء المحاولة لاحقاً.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `تأكيد الطلب عبر الموقع`;
    }
};