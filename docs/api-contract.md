# API Contract (extraido del codigo Node)

Base URL: /api
Auth: Authorization: Bearer <token>
JWT payload: { id, email, roles[] }
Uploads: /uploads/portfolio/<archivo>
Health: GET /api/health -> { ok: true }

## Auth
- POST /api/auth/login
  - Body: { email, password }
  - 200: { token, user:{ id,email,fullName,phone,roles[] } }
  - 400/401
- GET /api/auth/me (auth)
  - 200: { id,email,fullName,phone,isActive,roles[] }
  - 401/404

## Users (roles: admin, editor_user_manager)
- GET /api/users
  - 200: [{ id,email,fullName,phone,active,roles[] }]
- POST /api/users
  - Body: { fullName,email,password,roles[]? }
  - 201: { id }
  - 400/409
- PATCH /api/users/:id/status
  - Body: { active }
  - 200: { ok:true }
  - 400/404/409 (no desactivar ultimo admin)

## Services (roles: admin, editor)
- GET /api/services
  - 200: [{ id,name,description,icon,displayOrder,public,isAddon,pricingType,price,currency,isActive }]
- POST /api/services
  - Body: { name,description,icon?,displayOrder?,isPublic?,isAddon?,pricingType?,price,currency?,isActive? }
  - 201: { id }
- PATCH /api/services/:id
  - Body parcial
  - 200: { ok:true }
- DELETE /api/services/:id
  - 204 (soft delete)

## Dashboard
- GET /api/dashboard/public
  - 200: { activeProjects, newQuotes }
- GET /api/dashboard (roles: admin, editor)
  - 200: { stats:{ activeProjects,newQuotes,sentQuotes,publishedPages }, activity:[{ type,message,happenedAt }] }

## Pages
- GET /api/pages/public/:slug
  - 200: page publicada con sections[] y blocks[]
- GET /api/pages (roles: admin, editor)
  - 200: [{ id,title,slug,status,sections }]
- POST /api/pages
  - Body: { title,slug,status?,metaTitle?,metaDescription? }
  - 201: { id }
  - 409 slug
- GET /api/pages/:id
  - 200: page + sections + blocks
- PATCH /api/pages/:id
  - Body parcial
  - 200: { ok:true }
  - 409 slug
- DELETE /api/pages/:id
  - 204 (borra secciones/bloques)
- GET /api/pages/:id/sections
  - 200: sections
- POST /api/pages/:id/sections
  - Body: { sectionKey, title?,description?,imageUrl?,sortOrder?,isVisible? }
  - 201: { id }
- PATCH /api/pages/sections/:id
  - Body parcial
  - 200: { ok:true }
- DELETE /api/pages/sections/:id
  - 204
- GET /api/pages/sections/:id/blocks
  - 200: blocks
- POST /api/pages/sections/:id/blocks
  - Body: { blockType, content?, sortOrder?, isVisible? }
  - 201: { id }
- PATCH /api/pages/blocks/:id
  - Body parcial
  - 200: { ok:true }
- DELETE /api/pages/blocks/:id
  - 204

## Projects (roles: admin, editor)
- GET /api/projects
  - 200: [{ id,name,clientName,address,status,portfolio }]
- POST /api/projects
  - Body: { name,clientName,address,description?,status?,startDate?,endDate?,slug?,details? }
  - 201: { id }
- GET /api/projects/:id
  - 200: detalle + portfolioEntry + images[]
- PATCH /api/projects/:id
  - Body parcial
  - 200: { ok:true }
- DELETE /api/projects/:id
  - 204
- PUT /api/projects/:id/portfolio
  - Body: { titleOverride?,category?,summary?,autocadUrl?,sortOrder?,isVisible? }
  - 201: { id } o 200: { ok:true }
- DELETE /api/projects/:id/portfolio
  - 204
- GET /api/projects/:id/images
  - 200: images
- POST /api/projects/:id/images
  - Body: { fileUrl, title?, altText?, isCover?, sortOrder? }
  - 201: { id }
- PATCH /api/projects/:id/images/:imageId
  - Body: { fileUrl?,title?,altText?,isCover?,sortOrder? }
  - 200: { ok:true }
- DELETE /api/projects/:id/images/:imageId
  - 204

## Portfolio
- GET /api/portfolio/public
  - 200: [{ id,title,category,description,coverImage }]
- GET /api/portfolio/public/:id
  - 200: { id,title,category,description,autocadUrl,heroImages[],coverImage,gallery[],specs[],tags[],blocks[] }
- GET /api/portfolio (roles: admin, editor)
  - 200: [{ id,projectId,order,project,visible,titleOverride }]
- GET /api/portfolio/:id
  - 200: detalle completo (images/specs/tags/blocks)
- PUT /api/portfolio/:id
  - Body: { titleOverride?,category?,summary?,autocadUrl?,sortOrder?,isVisible?,coverMediaId?,heroMediaIds?,galleryMediaIds?,specs?,tags?,blocks? }
  - 200: { ok:true }

## Quotes (roles: admin, editor)
- GET /api/quotes/options
  - 200: { pricingRates[], services[] }
- GET /api/quotes
  - 200: [{ id,fullName,projectName,areaM2,totalCost,status,currency,createdAt }]
- GET /api/quotes/:id
  - 200: detalle + services[]
- POST /api/quotes
  - Body: (fullName/phone/email/projectName/areaM2 obligatorios)
  - 201: { id }
- PATCH /api/quotes/:id
  - Body parcial (recalcula totales si cambia area/tarifa/etc)
  - 200: { ok:true }
- POST /api/quotes/:id/services
  - Body: { serviceId, quantity?, unitPrice? }
  - 201: { id }
- PATCH /api/quotes/:id/services/:serviceId
  - Body: { quantity?, unitPrice? }
  - 200: { ok:true }
- DELETE /api/quotes/:id/services/:serviceId
  - 204

## Media (roles: admin, editor)
- POST /api/media
  - Body: { filename, data(base64 o dataURL), mimeType?, title?, altText? }
  - 201: { id, fileUrl }
