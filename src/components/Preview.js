import React, { useEffect, useState, useRef } from 'react';

const Preview = ({ fileSystem, fileContents, activeFileId, lastChangeTime }) => {
    const iframeRef = useRef(null);
    const [srcDoc, setSrcDoc] = useState('');

    useEffect(() => {
        // Attempt to find HTML, CSS, and JS files to bundle
        let htmlContent = '';
        let cssContent = '';
        let jsContent = '';

        const files = Object.values(fileSystem).filter(node => node.type === 'file');
        
        let htmlNode = files.find(f => f.id === activeFileId && f.name.endsWith('.html'));
        if (!htmlNode) {
            htmlNode = files.find(f => f.name === 'index.html') || files.find(f => f.name.endsWith('.html'));
        }

        if (htmlNode && fileContents[htmlNode.id]) {
            htmlContent = fileContents[htmlNode.id];
        } else {
            htmlContent = `<html><body><div style="font-family:sans-serif;padding:20px;color:#555;"><p>No HTML file found. Create <code>index.html</code> to see preview.</p></div></body></html>`;
        }

        // Gather all CSS files
        files.filter(f => f.name.endsWith('.css')).forEach(node => {
            if (fileContents[node.id]) cssContent += `\n/* ${node.name} */\n${fileContents[node.id]}`;
        });

        // Gather all JS files
        files.filter(f => f.name.endsWith('.js')).forEach(node => {
            if (fileContents[node.id]) jsContent += `\n/* ${node.name} */\n${fileContents[node.id]}`;
        });

        // Robust injection: Place styles in <head> and scripts at end of <body>
        let finalHtml = htmlContent;
        const styleTag = `<style>${cssContent}</style>`;
        const scriptTag = `<script>
            try {
                ${jsContent}
            } catch (err) {
                console.error("Preview Error:", err);
            }
        </script>`;

        if (finalHtml.includes('</head>')) {
            finalHtml = finalHtml.replace('</head>', `${styleTag}</head>`);
        } else {
            finalHtml = styleTag + finalHtml;
        }

        if (finalHtml.includes('</body>')) {
            finalHtml = finalHtml.replace('</body>', `${scriptTag}</body>`);
        } else {
            finalHtml += scriptTag;
        }

        setSrcDoc(finalHtml);
    }, [fileSystem, fileContents, activeFileId, lastChangeTime]);

    return (
        <div className="preview-container" style={{ 
            height: '100%', 
            width: '100%', 
            backgroundColor: '#ffffff', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            <div style={{ 
                padding: '4px 12px', 
                backgroundColor: '#f1f3f4', 
                fontSize: '11px', 
                color: '#5f6368', 
                borderBottom: '1px solid #ddd',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff5f56' }}></div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffbd2e' }}></div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#27c93f' }}></div>
                <span style={{ fontWeight: '600' }}>Live Preview</span>
            </div>
            <iframe
                key={lastChangeTime}
                ref={iframeRef}
                title="live-preview"
                srcDoc={srcDoc}
                style={{ flex: 1, width: '100%', height: '100%', border: 'none', backgroundColor: '#ffffff' }}
                sandbox="allow-scripts allow-modals allow-same-origin"
            />
        </div>
    );
};

export default Preview;
