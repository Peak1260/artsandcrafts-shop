const apiUrl = 'https://yk6ghkfer4.execute-api.us-west-1.amazonaws.com/prod';

function generateProductId() {
    return Math.floor(Math.random() * 1000);
}

async function fetchProducts() {
    try {
        const response = await fetch(`${apiUrl}/products`);
        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        displayProducts(data.products);
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

function displayProducts(products) {
    const productList = document.getElementById('productList');
    productList.innerHTML = ''; 
    products.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'product';
        productElement.innerHTML = `
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <p>$${product.price}</p>
            <img src="${product.image}" alt="${product.name}">
            <button onclick="deleteProduct('${product.productId}')">Delete Product</button>
            <button onclick="updateProductPrompt('${product.productId}', '${product.name}', '${product.price}', '${product.description}')">Update Price</button>
        `;
        productList.appendChild(productElement);
    });
}

document.getElementById('productForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('productName').value;
    const price = document.getElementById('productPrice').value;
    const description = document.getElementById('productDescription').value;
    const imageFile = document.getElementById('productImage').files[0];
    const fileType = imageFile.type.split('/')[1]; 
    
    const productId = generateProductId();

    try {
        const response = await fetch(`${apiUrl}/product`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ productId: productId.toString(), name: name, price: Number(price), description: description, imageType: fileType })
        });

        if (!response.ok) {
            throw new Error('Failed to add product');
        }

        const result = await response.json();
        const uploadURL = result.uploadURL;

        await fetch(uploadURL, {
            method: 'PUT',
            headers: {
                'Content-Type': imageFile.type, 
            },
            body: imageFile
        });

        console.log('Image uploaded successfully');
        fetchProducts();
        document.getElementById('productForm').reset();
    } catch (error) {
        console.error('Error adding product:', error);
    }
});

function updateProductPrompt(id, price) {
    const newPrice = prompt("Enter new price:", price);

    if (newPrice) {
        updateProduct(id, newPrice);
    }
}

async function updateProduct(productId, price) {
    try {
        const response = await fetch(`${apiUrl}/product`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ productId, updateKey: 'price', updateValue: price }) 
        });
        if (!response.ok) {
            throw new Error('Failed to update product');
        }
        const result = await response.json();
        console.log('Product updated:', result);
        fetchProducts();
    } catch (error) {
        console.error('Error updating product:', error);
    }
}

async function deleteProduct(productId) {
    try {
        const response = await fetch(`${apiUrl}/product`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ productId })
        });
        if (!response.ok) {
            throw new Error('Failed to delete product');
        }
        const result = await response.json();
        console.log('Product deleted:', result);
        fetchProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
    }
}

fetchProducts();
