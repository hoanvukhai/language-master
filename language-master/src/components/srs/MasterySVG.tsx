

interface MasterySVGProps {
  level: number | 'unlearned';
  className?: string;
}

export default function MasterySVG({ level, className = "w-16 h-16" }: MasterySVGProps) {
  // ================= Shared Vector Assets =================
  const SoilMound = () => (
    <path
      d="M80 443 C91 423 107 407 126 395 C146 382 168 375 192 370 C214 366 238 367 256 368 C280 368 304 373 326 382 C349 391 369 405 386 423 C393 430 398 438 400 446 C402 453 397 460 391 463 C387 465 381 465 375 465 H104 C96 465 88 465 84 461 C78 457 77 450 80 443 Z"
      fill="#9E6351"
    />
  );


  const Seed = ({ x = 256, y = 256, scale = 1, rotation = 0 }: any) => (
    <g transform={`translate(${x}, ${y}) scale(${scale}) rotate(${rotation})`}>
      <ellipse cx="0" cy="0" rx="55" ry="92" fill="#C5702A" />
      <path d="M -30 -40 C -15 -60 15 -60 30 -40" fill="none" stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round" opacity="0.7" />
      <path d="M 15 -55 C -10 -20 20 20 -15 55" fill="none" stroke="#2C2623" strokeWidth="16" />
    </g>
  );

  const SproutPlant = () => (
    <g>
      <path d="M224 370 C223 343 218 316 208 289 C198 261 185 238 166 218 C155 207 143 197 132 190 C126 186 126 178 131 174 C136 169 144 169 150 173 C169 187 188 204 202 222 C222 247 235 274 242 302 C248 327 250 350 250 370 Z" fill="#78A635"/>
      <path d="M222 370 C223 341 228 312 239 285 C250 256 266 231 286 208 C305 186 328 165 356 145 C363 140 371 143 376 149 C381 156 379 164 372 169 C344 189 322 207 304 227 C285 249 272 272 265 297 C258 322 256 347 256 370 Z" fill="#78A635"/>
      <path d="M239 292 C218 291 194 284 174 273 C151 261 132 245 116 227 C99 207 85 184 75 161 C65 138 63 119 68 108 C73 98 84 96 98 96 C121 96 146 103 168 115 C191 128 211 145 224 163 C236 180 241 198 241 218 C241 243 238 267 239 292 Z" fill="#A5D261"/>
      <path d="M256 293 C257 266 261 237 271 209 C281 180 296 155 316 133 C337 110 363 91 389 77 C413 65 432 62 445 67 C458 72 464 84 464 100 C465 122 457 149 446 171 C434 196 417 217 397 231 C377 244 354 251 331 253 C306 255 281 247 256 293 Z" fill="#A5D261"/>
    </g>
  );

  const CustomLeaf = ({ x, y, scale = 1, rotation = 0, flip = false }: any) => (
    <g transform={`translate(${x}, ${y}) scale(${scale}) rotate(${rotation}) ${flip ? 'scale(-1, 1)' : ''}`}>
      <g transform="translate(-239, -292)">
        <path d="M239 292 C218 291 194 284 174 273 C151 261 132 245 116 227 C99 207 85 184 75 161 C65 138 63 119 68 108 C73 98 84 96 98 96 C121 96 146 103 168 115 C191 128 211 145 224 163 C236 180 241 198 241 218 C241 243 238 267 239 292 Z" fill="#A5D261"/>
      </g>
    </g>
  );

  const SaplingLevel2 = () => (
    <g transform="translate(0, 15)">
      {/* Main Stem (Straight Up) */}
      <path d="M 256 380 L 256 165" stroke="#78A635" strokeWidth="20" fill="none" strokeLinecap="round" />
      
      {/* Lower Branches */}
      <path d="M 256 310 Q 230 305 210 280" stroke="#78A635" strokeWidth="16" fill="none" strokeLinecap="round" />
      <path d="M 256 310 Q 282 305 302 280" stroke="#78A635" strokeWidth="16" fill="none" strokeLinecap="round" />
      
      {/* Upper Branches */}
      <path d="M 256 240 Q 240 235 220 210" stroke="#78A635" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M 256 240 Q 272 235 292 210" stroke="#78A635" strokeWidth="14" fill="none" strokeLinecap="round" />
      
      {/* Lower Leaves */}
      <CustomLeaf x={210} y={280} scale={0.9} rotation={-15} />
      <CustomLeaf x={302} y={280} scale={0.9} rotation={15} flip={true} />
      
      {/* Middle Leaves */}
      <CustomLeaf x={220} y={210} scale={0.75} rotation={0} />
      <CustomLeaf x={292} y={210} scale={0.75} rotation={0} flip={true} />
      
      {/* Top Center Leaf */}
      <CustomLeaf x={256} y={165} scale={0.7} rotation={25} />
    </g>
  );

  // === Beautiful Tree Components ===
  const BeautifulTrunk = () => (
    <g>
      <path d="M 190 420 Q 235 410 235 280 L 235 150 L 275 150 L 275 280 Q 275 410 320 420 Q 255 440 190 420 Z" fill="#D08A62" />
      <path d="M 255 150 L 275 150 L 275 280 Q 275 410 320 420 Q 280 430 255 425 Q 265 380 255 150 Z" fill="#B0704A" />
    </g>
  );

  const CanopyLayer = ({ fill }: { fill: string }) => (
    <g fill={fill}>
      <circle cx="256" cy="140" r="95" />
      <circle cx="160" cy="210" r="85" />
      <circle cx="352" cy="210" r="85" />
      <circle cx="200" cy="270" r="65" />
      <circle cx="312" cy="270" r="65" />
    </g>
  );

  const BeautifulCanopy = ({ mainColor = "#A5D261", shadowColor = "#78A635" }: any) => (
    <g>
      <g transform="translate(0, 15)">
        <CanopyLayer fill={shadowColor} />
      </g>
      <CanopyLayer fill={mainColor} />
    </g>
  );

  const Flower = ({ x, y, scale = 1, rotation = 0 }: any) => (
    <g transform={`translate(${x}, ${y}) scale(${scale}) rotate(${rotation})`}>
      <circle cx="0" cy="-15" r="14" fill="#FFF0F5" />
      <circle cx="14" cy="-5" r="14" fill="#FFF0F5" />
      <circle cx="9" cy="12" r="14" fill="#FFF0F5" />
      <circle cx="-9" cy="12" r="14" fill="#FFF0F5" />
      <circle cx="-14" cy="-5" r="14" fill="#FFF0F5" />
      <circle cx="0" cy="0" r="8" fill="#FFB7C5" />
    </g>
  );

  const Apple = ({ x, y, scale = 1, rotation = 0 }: any) => (
    <g transform={`translate(${x}, ${y}) scale(${scale}) rotate(${rotation})`}>
      <path d="M 0 -15 Q -5 -25 5 -30" stroke="#8B5A2B" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M 0 22 C -35 22 -35 -15 0 -10 C 35 -15 35 22 0 22 Z" fill="#FF4B5C" />
      <path d="M -12 -2 A 8 8 0 0 0 -8 10" stroke="#FFCCCC" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6"/>
    </g>
  );

  // ================= Get Content by Level =================
  const getSVGContent = () => {
    switch (level) {
      case 'unlearned':
      case 0:
        return (
          <g transform="translate(0, 30)">
            <Seed x={256} y={256} scale={0.9} rotation={15} />
            <Seed x={180} y={320} scale={0.7} rotation={-45} />
            <Seed x={340} y={290} scale={0.8} rotation={60} />
          </g>
        );
      
      case 1:
        return (
          <>
            {/* Soft Green Mound */}
            <path
              d="M80 443 C91 423 107 407 126 395 C146 382 168 375 192 370 C214 366 238 367 256 368 C280 368 304 373 326 382 C349 391 369 405 386 423 C393 430 398 438 400 446 C402 453 397 460 391 463 C387 465 381 465 375 465 H104 C96 465 88 465 84 461 C78 457 77 450 80 443 Z"
              fill="#A5D261"
            />
            {/* Darker Green Base */}
            <path d="M 126 395 C 146 382 168 375 192 370 C 214 366 238 367 256 368 C 280 368 304 373 326 382 Q 256 420 126 395 Z" fill="#78A635" />
            
            {/* Glowing Aura for Seed */}
            <ellipse cx="256" cy="310" rx="40" ry="15" fill="#F1C40F" opacity="0.2" />
            
            {/* Seed (Planted and glowing slightly) */}
            <Seed x={256} y={300} scale={0.4} rotation={15} />
            
            {/* Tiny stars */}
            <circle cx="210" cy="270" r="3" fill="#F1C40F" opacity="0.8" />
            <circle cx="290" cy="280" r="4" fill="#F1C40F" opacity="0.8" />
            <circle cx="270" cy="240" r="2" fill="#F1C40F" opacity="0.6" />
          </>
        );

      case 2:
        return (
          <>
            <SoilMound />
            <g transform="translate(0, 50)">
              <SproutPlant />
            </g>
          </>
        );

      case 3:
        return (
          <>
            <SoilMound />
            <SaplingLevel2 />
          </>
        );

      case 4:
        return (
          <>
            <SoilMound />
            <BeautifulTrunk />
            <BeautifulCanopy mainColor="#A5D261" shadowColor="#78A635" />
          </>
        );

      case 5:
        return (
          <>
            <SoilMound />
            <BeautifulTrunk />
            <BeautifulCanopy mainColor="#FFB7C5" shadowColor="#FF9EAA" />
            <Flower x={200} y={150} scale={1.3} />
            <Flower x={320} y={180} scale={1.1} rotation={15} />
            <Flower x={150} y={240} scale={1.2} rotation={-20} />
            <Flower x={270} y={260} scale={1} rotation={45} />
            <Flower x={360} y={250} scale={1.15} rotation={-10} />
            <Flower x={256} y={100} scale={1.4} rotation={30} />
          </>
        );

      case 6:
        return (
          <>
            <SoilMound />
            <BeautifulTrunk />
            <BeautifulCanopy mainColor="#A5D261" shadowColor="#78A635" />
            <Apple x={180} y={180} scale={1.2} rotation={-5} />
            <Apple x={330} y={160} scale={1.1} rotation={10} />
            <Apple x={260} y={110} scale={1.3} />
            <Apple x={230} y={250} scale={1.2} rotation={-15} />
            <Apple x={320} y={260} scale={1.15} rotation={5} />
          </>
        );

      case 7:
        return (
          <g>
            <circle cx="256" cy="220" r="220" fill="#F1C40F" opacity="0.1" />
            
            {/* Background Left Tree - Closer to center */}
            <g transform="translate(-25, 146) scale(0.7)">
              <BeautifulTrunk />
              <BeautifulCanopy mainColor="#95C251" shadowColor="#689E28" />
            </g>
            
            {/* Background Right Tree - Pushed further right but safe */}
            <g transform="translate(175, 146) scale(0.7)">
              <BeautifulTrunk />
              <BeautifulCanopy mainColor="#95C251" shadowColor="#689E28" />
            </g>
            
            {/* Center Majestic Tree */}
            <g transform="translate(0, 30)">
              <BeautifulTrunk />
              <BeautifulCanopy mainColor="#A5D261" shadowColor="#78A635" />
            </g>

            {/* Foreground Bushes */}
            <g transform="translate(-40, 310) scale(0.65)">
              <CanopyLayer fill="#A5D261" />
              <circle cx="256" cy="140" r="15" fill="#F1C40F" />
              <circle cx="160" cy="210" r="18" fill="#F1C40F" />
              <circle cx="352" cy="210" r="15" fill="#F1C40F" />
            </g>
            <g transform="translate(240, 330) scale(0.6)">
              <CanopyLayer fill="#A5D261" />
              <circle cx="256" cy="140" r="15" fill="#F1C40F" />
              <circle cx="160" cy="210" r="18" fill="#F1C40F" />
            </g>

            {/* Ground Layers */}
            <path d="M 0 450 L 512 450 L 512 512 L 0 512 Z" fill="#A5D261" />
            <path d="M 0 475 L 512 475 L 512 512 L 0 512 Z" fill="#78A635" />
          </g>
        );

      default:
        return null;
    }
  };

  return (
    <svg 
      className={className} 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {getSVGContent()}
    </svg>
  );
}
