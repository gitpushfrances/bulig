import type { CSSProperties, ReactNode } from 'react'
import { HOME_NEEDS } from '../rules/needs.ts'
import { CATEGORIES } from '../types.ts'
import pageStyles from '../pages/Page.module.css'
import RopiLoader from './RopiLoader.tsx'
import styles from './Skeleton.module.css'

// Each skeleton reuses the real component's layout classes, so the content lands exactly where
// the placeholder was. They only stand in for records: the national hotline never waits.

interface BoneProps {
  width?: CSSProperties['width']
  height?: CSSProperties['height']
  shape?: 'line' | 'title' | 'round' | 'block'
  className?: string
}

function Bone({ width, height, shape = 'line', className = '' }: BoneProps) {
  return <span className={`${styles.bone} ${styles[shape]} ${className}`} style={{ width, height }} />
}

interface LoadingProps {
  children: ReactNode
  // Ropi walks over the placeholders on a long wait. Only where UI-UX.md allows Ropi:
  // never on Home or Emergency.
  ropi?: boolean
  className?: string
}

// One status for the whole block: screen readers hear "Loading…" once, not every placeholder.
function Loading({ children, ropi = false, className = '' }: LoadingProps) {
  return (
    <div className={`${styles.loading} ${className}`} role="status" aria-busy="true">
      <span className="visually-hidden">Loading…</span>
      {ropi && (
        <span className={styles.ropi}>
          <RopiLoader />
        </span>
      )}
      <div aria-hidden="true" className={pageStyles.section}>
        {children}
      </div>
    </div>
  )
}

function RowBones({ count }: { count: number }) {
  return (
    <div className={pageStyles.panel}>
      <ul className={pageStyles.rows}>
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className={pageStyles.row}>
            <Bone shape="round" width={20} height={20} />
            <span className={`${styles.stack} ${styles.grow}`}>
              <Bone width="60%" />
              <Bone width="40%" height="0.75rem" />
            </span>
            <Bone shape="round" width={44} height={44} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function CardBones({ count, height }: { count: number; height: string }) {
  return (
    <ul className={pageStyles.list}>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <Bone shape="block" width="100%" height={height} />
        </li>
      ))}
    </ul>
  )
}

// Home's "What's wrong?" tiles: the first is the feature tile, Others runs wide.
export function BentoSkeleton() {
  return (
    <Loading>
      <div className={pageStyles.bento}>
        {HOME_NEEDS.map((need) => (
          <Bone key={need.id} shape="block" className={pageStyles.bentoTile} />
        ))}
      </div>
    </Loading>
  )
}

// Services: one card per category.
export function OfferGridSkeleton() {
  return (
    <Loading ropi>
      <div className={pageStyles.offerGrid}>
        {CATEGORIES.map((c) => (
          <Bone key={c} shape="block" height="9.5rem" />
        ))}
      </div>
    </Loading>
  )
}

// Compact rows in a panel, as on Home.
export function RowsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Loading>
      <RowBones count={count} />
    </Loading>
  )
}

interface CardListProps {
  count?: number
  // A card's real height, measured at 360px: an emergency contact is 12rem, a place 7.5rem.
  height?: string
  // A section heading above the cards, as the real list has.
  heading?: boolean
  ropi?: boolean
}

// Full cards in a list: Emergency's local numbers, Saved.
export function CardListSkeleton({ count = 3, height = '7.5rem', heading = false, ropi = false }: CardListProps) {
  return (
    <Loading ropi={ropi}>
      {heading && <Bone shape="title" width="9rem" height="2rem" />}
      <CardBones count={count} height={height} />
    </Loading>
  )
}

// Nearby results: the big nearest card, then more rows.
export function NearbySkeleton() {
  return (
    <Loading ropi>
      <Bone shape="title" width="9rem" />
      <Bone shape="block" width="100%" height="17rem" />
      <Bone shape="title" width="8rem" />
      <RowBones count={3} />
    </Loading>
  )
}

// Place details: kind, name, landmark and status, Call and Route, then the week's hours.
export function PlaceSkeleton() {
  return (
    <Loading>
      <span className={styles.stack}>
        <Bone width="35%" />
        <Bone shape="title" width="70%" height="1.75rem" />
        <Bone width="55%" />
        <Bone width="40%" />
      </span>
      <span className={pageStyles.actions}>
        <Bone shape="block" height={52} className={styles.grow} />
        <Bone shape="block" height={52} className={styles.grow} />
      </span>
      <Bone shape="block" width="100%" height="14rem" />
    </Loading>
  )
}
