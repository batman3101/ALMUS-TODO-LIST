import React from 'react';

export interface SvgIconProps {
  name: string;
  category?: string;
  size?: number;
  className?: string;
  color?: string;
}

/**
 * SVG 아이콘 컴포넌트
 * /assets/icons/ 폴더의 SVG 파일들을 동적으로 로드하여 표시
 */
export const SvgIcon: React.FC<SvgIconProps> = ({
  name,
  category = '',
  size = 24,
  className = '',
  color
}) => {
  const iconPath = category 
    ? `/assets/icons/${category}/${name}.svg`
    : `/assets/icons/${name}.svg`;

  const style: React.CSSProperties = {
    width: size,
    height: size,
    ...(color && { color })
  };

  return (
    <img
      src={iconPath}
      alt={`${name} icon`}
      className={`svg-icon ${className}`}
      style={style}
      onError={(e) => {
        console.warn(`SVG icon not found: ${iconPath}`);
        e.currentTarget.style.display = 'none';
      }}
    />
  );
};

/**
 * 인라인 SVG 아이콘 컴포넌트 (색상 변경 가능)
 */
export const InlineSvgIcon: React.FC<SvgIconProps & { svg: string }> = ({
  svg,
  size = 24,
  className = '',
  color
}) => {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    ...(color && { fill: color })
  };

  return (
    <div
      className={`inline-svg-icon ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default SvgIcon;