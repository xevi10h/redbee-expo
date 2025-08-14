const RESEND_API_KEY = process.env.RESEND_API_KEY;

const getUserTypeMessage = (userType) => {
	switch (userType) {
		case 'fan':
			return {
				title: 'Confirmación de registro - Lista de espera Redbee',
				message:
					'Gracias por unirte a nuestra lista de espera. Te mantendremos informado sobre el lanzamiento y las novedades de la plataforma.',
			};
		case 'creator':
			return {
				title: 'Confirmación de registro - Lista de espera Redbee',
				message:
					'Gracias por tu interés en Redbee. Te contactaremos con información sobre las herramientas para creadores cuando estén disponibles.',
			};
		case 'brand':
			return {
				title: 'Confirmación de registro - Lista de espera Redbee',
				message:
					'Gracias por tu interés en colaborar. Te mantendremos informado sobre las oportunidades de partnership cuando lancemos la plataforma.',
			};
		default:
			return {
				title: 'Confirmación de registro - Lista de espera Redbee',
				message:
					'Gracias por unirte a nuestra lista de espera. Te contactaremos con más información próximamente.',
			};
	}
};

exports.handler = async (event, context) => {
	// CORS headers
	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
	};

	// Handle CORS preflight
	if (event.httpMethod === 'OPTIONS') {
		return {
			statusCode: 200,
			headers,
			body: '',
		};
	}

	// Only allow POST
	if (event.httpMethod !== 'POST') {
		return {
			statusCode: 405,
			headers,
			body: JSON.stringify({ error: 'Method not allowed' }),
		};
	}

	try {
		console.log('📧 Netlify email function called');

		const { email, user_type } = JSON.parse(event.body);
		console.log('📧 Received data:', { email, user_type });

		// Validate input
		if (!email || !user_type) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({
					success: false,
					error: 'Email and user_type are required',
				}),
			};
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({
					success: false,
					error: 'Invalid email format',
				}),
			};
		}

		// Check if API key is configured
		if (!RESEND_API_KEY) {
			console.error('❌ RESEND_API_KEY is not configured');
			return {
				statusCode: 500,
				headers,
				body: JSON.stringify({
					success: false,
					error: 'Email service not configured',
				}),
			};
		}

		console.log('✅ RESEND_API_KEY is configured');

		const { title, message } = getUserTypeMessage(user_type);
		console.log('📧 Email template:', { title });

		const emailHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a Redbee</title>
        <style>
            /* CSS simplificado para mejor deliverability */
            body { 
                font-family: Arial, sans-serif; 
                line-height: 1.6; 
                margin: 0;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container { 
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header { 
                background: linear-gradient(135deg, #E1306C 0%, #F77737 100%);
                color: white; 
                padding: 40px 30px; 
                text-align: center;
            }
            .logo { 
                font-size: 32px; 
                font-weight: bold; 
                margin-bottom: 10px;
            }
            .content { 
                padding: 40px 30px;
                color: #333333;
            }
            .welcome-title {
                font-size: 24px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 20px;
                color: #E1306C;
            }
            .message {
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 30px;
                text-align: center;
            }
            .features {
                margin: 30px 0;
            }
            .feature {
                margin-bottom: 20px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 6px;
                border-left: 4px solid #E1306C;
            }
            .feature h3 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 18px;
            }
            .cta-section {
                text-align: center;
                margin: 30px 0;
                padding: 25px;
                background: #f0f8ff;
                border-radius: 6px;
            }
            .footer { 
                text-align: center; 
                padding: 20px;
                border-top: 1px solid #eee;
                font-size: 14px;
                color: #666;
            }
            .unsubscribe {
                color: #666;
                font-size: 12px;
                text-decoration: none;
            }
            /* Responsive */
            @media (max-width: 600px) {
                .container { margin: 10px; }
                .header, .content { padding: 25px 20px; }
                .logo { font-size: 28px; }
                .welcome-title { font-size: 22px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Redbee</div>
                <p>El futuro del contenido digital</p>
            </div>
            
            <div class="content">
                <h1 class="welcome-title">¡Bienvenido a la revolución!</h1>
                
                <p class="message">
                    Has dado el primer paso hacia una experiencia completamente nueva en contenido digital. 
                    Gracias por unirte a nuestra waiting list exclusiva.
                </p>
                
                <div class="features">
                    <div class="feature">
                        <h3>🚀 Acceso Prioritario</h3>
                        <p>Serás de los primeros en experimentar todas las funcionalidades exclusivas de la plataforma.</p>
                    </div>
                    
                    <div class="feature">
                        <h3>💎 Contenido Premium</h3>
                        <p>Acceso temprano a creadores únicos y contenido exclusivo que no encontrarás en ningún otro lugar.</p>
                    </div>
                    
                    <div class="feature">
                        <h3>⚡ Experiencia Única</h3>
                        <p>Una plataforma potenciada por IA, diseñada para ofrecer la mejor experiencia en contenido digital.</p>
                    </div>
                </div>
                
                <div class="cta-section">
                    <p><strong>Te mantendremos informado</strong> sobre nuestro lanzamiento y recibirás actualizaciones 
                    exclusivas sobre el desarrollo de la plataforma. ¡Prepárate para algo extraordinario!</p>
                </div>
                
                <div class="footer">
                    <p><strong>Redbee</strong> © 2025 - El futuro del contenido digital</p>
                    <a href="%unsubscribe_url%" class="unsubscribe">Darse de baja</a>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

		// Payload optimizado para mejor deliverability
		const optimizedEmailPayload = {
			from: 'Redbee <hello@updates.redbeeapp.com>',
			to: [email],
			subject: 'Bienvenido a Redbee - Confirmación de registro', // Evita palabras spam
			html: emailHtml,
			text: `
    ¡Bienvenido a Redbee!
    
    Has dado el primer paso hacia una experiencia completamente nueva en contenido digital. 
    Gracias por unirte a nuestra waiting list exclusiva.
    
    • Acceso Prioritario: Serás de los primeros en experimentar todas las funcionalidades exclusivas
    • Contenido Premium: Acceso temprano a creadores únicos y contenido exclusivo  
    • Experiencia Única: Una plataforma potenciada por IA
    
    Te mantendremos informado sobre nuestro lanzamiento y recibirás actualizaciones exclusivas.
    
    Redbee © 2025 - El futuro del contenido digital
    Para darte de baja: %unsubscribe_url%
        `, // Versión en texto plano IMPORTANTE
			headers: {
				'X-Entity-Ref-ID': 'redbee-waiting-list',
				'X-Priority': '3',
				'X-Mailer': 'Redbee Platform',
				'List-Unsubscribe': '<mailto:unsubscribe@redbeeapp.com>',
				'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
				'Reply-To': 'admin@redbeeapp.com', // Evita no-reply
			},
			tags: [
				{
					name: 'category',
					value: 'transactional',
				},
				{
					name: 'type',
					value: 'welcome',
				},
			],
		};

		console.log('📧 Sending email to Resend API...');

		const emailPayload = {
			from: 'Redbee <hello@updates.redbeeapp.com>',
			to: [email],
			subject: 'Bienvenido a Redbee - Confirmación de registro',
			html: emailHtml,
			headers: {
				'X-Entity-Ref-ID': 'redbee-waiting-list',
				'X-Priority': '3',
				'X-Mailer': 'Redbee Platform',
				'List-Unsubscribe': '<mailto:unsubscribe@redbeeapp.com>',
				'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
			},
			tags: [
				{
					name: 'category',
					value: 'transactional',
				},
				{
					name: 'type',
					value: 'welcome',
				},
			],
		};

		console.log('📧 Email payload:', {
			from: emailPayload.from,
			to: emailPayload.to,
			subject: emailPayload.subject,
		});

		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${RESEND_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(emailPayload),
		});

		console.log('📧 Resend API response status:', response.status);

		if (!response.ok) {
			const error = await response.text();
			console.error('❌ Resend API error:', error);

			return {
				statusCode: 500,
				headers,
				body: JSON.stringify({
					success: false,
					error: `Failed to send email: ${error}`,
				}),
			};
		}

		const data = await response.json();
		console.log('✅ Email sent successfully:', data);

		return {
			statusCode: 200,
			headers,
			body: JSON.stringify({
				success: true,
				message: 'Confirmation email sent successfully',
				email_id: data.id,
			}),
		};
	} catch (error) {
		console.error('Error sending confirmation email:', error);

		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({
				success: false,
				error: error.message,
			}),
		};
	}
};
