# 5-screen layout specification

Reference canvas: **1844 × 853 px**. X/Y originate at top-left. PNG boxes include transparent padding. All coordinates are measured from the approved mockups.

日本語の運用説明は `CODEX_IMPLEMENTATION.md` と `README.md` を参照してください。

## Screen index

| Screen | Layout data | Mockup |
|---|---|---|
| title | layouts/title.json | mockups/title.png |
| nickname | layouts/nickname.json | mockups/nickname.png |
| member | layouts/member.json | mockups/member.png |
| background | layouts/background.json | mockups/background.png |
| home | home_approved/spec/home_layout.json | mockups/home.png |

## title

| ID | Type | X | Y | W | H | Z | File / text |
|---|---|---:|---:|---:|---:|---:|---|
| photo_background | photo | 0 | 0 | 1844 | 853 | 0 | assets/title/photo_plate.png |
| tap_strip | panel | 593 | 742 | 657 | 65 | 10 | assets/title/tap_strip.png |
| title_logo | logo | 275 | 484 | 1263 | 262 | 20 | assets/title/title_logo.png |
| version | text | 874 | 695 | 94 | 29 | 40 | Ver.3 |
| tap_label | text | 757 | 760 | 334 | 24 | 40 | TAP TO START |

### Tap targets

| ID | X | Y | W | H | Action / route |
|---|---:|---:|---:|---:|---|
| start | 0 | 0 | 1844 | 853 | first-run / returning routing |

## nickname

| ID | Type | X | Y | W | H | Z | File / text |
|---|---|---:|---:|---:|---:|---:|---|
| photo_background | photo | 0 | 0 | 1844 | 853 | 0 | assets/nickname/photo_plate.png |
| nickname_header | panel | 92 | 26 | 1661 | 84 | 10 | assets/nickname/nickname_header.png |
| nickname_panel | panel | 385 | 336 | 1076 | 337 | 10 | assets/nickname/nickname_panel.png |
| nickname_input | panel | 503 | 475 | 838 | 102 | 10 | assets/nickname/nickname_input.png |
| nickname_confirm | panel | 685 | 695 | 474 | 118 | 10 | assets/nickname/nickname_confirm.png |
| nickname_back | icon | 140 | 49 | 24 | 40 | 30 | assets/icons/nickname_back.png |
| nickname_confirm_arrow | icon | 1075 | 731 | 29 | 47 | 30 | assets/icons/nickname_confirm_arrow.png |
| header | text | 245 | 50 | 307 | 38 | 40 | ニックネーム設定 |
| step | text | 1615 | 54 | 89 | 32 | 40 | 01 / 03 |
| prompt | text | 663 | 411 | 518 | 34 | 40 | ニックネームを入力してください |
| name | text | 546 | 512 | 97 | 31 | 40 | Nene |
| input_caret | text | 657 | 503 | 4 | 49 | 40 | vertical caret |
| hint | text | 803 | 592 | 239 | 23 | 40 | あとから変更できます |
| confirm | text | 876 | 729 | 91 | 45 | 40 | 決定 |

### Tap targets

| ID | X | Y | W | H | Action / route |
|---|---:|---:|---:|---:|---|
| back | 97 | 30 | 107 | 76 | title |
| input | 508 | 479 | 830 | 94 | native-text-input |
| confirm | 690 | 700 | 465 | 108 | member |

## member

| ID | Type | X | Y | W | H | Z | File / text |
|---|---|---:|---:|---:|---:|---:|---|
| photo_background | photo | 0 | 0 | 1844 | 853 | 0 | assets/member/photo_plate.png |
| member_header | panel | 99 | 27 | 1648 | 83 | 10 | assets/member/member_header.png |
| card_selected | panel | 306 | 145 | 424 | 533 | 10 | assets/member/card_selected.png |
| card_hiroto | panel | 732 | 171 | 379 | 484 | 10 | assets/member/card_hiroto.png |
| card_ryoka | panel | 1138 | 171 | 387 | 487 | 10 | assets/member/card_ryoka.png |
| member_confirm | panel | 616 | 721 | 614 | 104 | 10 | assets/member/member_confirm.png |
| motoki_portrait | photo | 337 | 197 | 361 | 392 | 15 | assets/photos/motoki_portrait.png |
| hiroto_portrait | photo | 748 | 191 | 348 | 394 | 15 | assets/photos/hiroto_portrait.png |
| ryoka_portrait | photo | 1154 | 191 | 356 | 395 | 15 | assets/photos/ryoka_portrait.png |
| member_back | icon | 142 | 51 | 36 | 38 | 30 | assets/icons/member_back.png |
| member_confirm_arrow | icon | 1153 | 758 | 23 | 33 | 30 | assets/icons/member_confirm_arrow.png |
| member_check | icon | 636 | 171 | 68 | 68 | 30 | assets/icons/member_check.png |
| header | text | 258 | 55 | 160 | 29 | 40 | 推しを選択 |
| step | text | 1601 | 57 | 88 | 28 | 40 | 02 / 03 |
| selected | text | 469 | 171 | 96 | 19 | 40 | SELECTED |
| motoki_name | text | 452 | 604 | 130 | 34 | 40 | 大森元貴 |
| hiroto_name | text | 859 | 599 | 126 | 30 | 40 | 若井滉斗 |
| ryoka_name | text | 1268 | 601 | 128 | 30 | 40 | 藤澤涼架 |
| confirm | text | 886 | 756 | 71 | 34 | 40 | 決定 |

### Tap targets

| ID | X | Y | W | H | Action / route |
|---|---:|---:|---:|---:|---|
| back | 105 | 33 | 113 | 72 | nickname |
| motoki | 320 | 157 | 394 | 506 | select-member |
| hiroto | 737 | 176 | 372 | 475 | select-member |
| ryoka | 1144 | 176 | 375 | 477 | select-member |
| confirm | 622 | 728 | 603 | 91 | background |

## background

| ID | Type | X | Y | W | H | Z | File / text |
|---|---|---:|---:|---:|---:|---:|---|
| photo_background | photo | 0 | 0 | 1844 | 853 | 0 | assets/background/photo_plate.png |
| background_header | panel | 95 | 22 | 1654 | 86 | 10 | assets/background/background_header.png |
| background_panel | panel | 57 | 144 | 1730 | 589 | 10 | assets/background/background_panel.png |
| background_confirm | panel | 1141 | 644 | 620 | 122 | 10 | assets/background/background_confirm.png |
| background_preview_frame | panel | 1142 | 212 | 621 | 356 | 10 | assets/background/background_preview_frame.png |
| background_selection_frame | panel | 76 | 165 | 183 | 135 | 10 | assets/background/background_selection_frame.png |
| background_tile_01 | photo | 88 | 177 | 159 | 111 | 15 | assets/photos/background_tile_01.png |
| background_tile_02 | photo | 263 | 177 | 154 | 111 | 15 | assets/photos/background_tile_02.png |
| background_tile_03 | photo | 434 | 177 | 156 | 112 | 15 | assets/photos/background_tile_03.png |
| background_tile_04 | photo | 607 | 177 | 158 | 112 | 15 | assets/photos/background_tile_04.png |
| background_tile_05 | photo | 781 | 177 | 158 | 112 | 15 | assets/photos/background_tile_05.png |
| background_tile_06 | photo | 955 | 177 | 156 | 112 | 15 | assets/photos/background_tile_06.png |
| background_tile_07 | photo | 88 | 311 | 181 | 113 | 15 | assets/photos/background_tile_07.png |
| background_tile_08 | photo | 286 | 311 | 190 | 113 | 15 | assets/photos/background_tile_08.png |
| background_tile_09 | photo | 495 | 311 | 190 | 114 | 15 | assets/photos/background_tile_09.png |
| background_tile_10 | photo | 704 | 311 | 194 | 114 | 15 | assets/photos/background_tile_10.png |
| background_tile_11 | photo | 917 | 311 | 194 | 115 | 15 | assets/photos/background_tile_11.png |
| background_tile_12 | photo | 88 | 448 | 156 | 107 | 15 | assets/photos/background_tile_12.png |
| background_tile_13 | photo | 263 | 448 | 153 | 108 | 15 | assets/photos/background_tile_13.png |
| background_tile_14 | photo | 434 | 448 | 156 | 108 | 15 | assets/photos/background_tile_14.png |
| background_tile_15 | photo | 607 | 448 | 156 | 108 | 15 | assets/photos/background_tile_15.png |
| background_tile_16 | photo | 781 | 448 | 157 | 108 | 15 | assets/photos/background_tile_16.png |
| background_tile_17 | photo | 954 | 448 | 157 | 108 | 15 | assets/photos/background_tile_17.png |
| background_tile_18 | photo | 88 | 577 | 156 | 112 | 15 | assets/photos/background_tile_18.png |
| background_tile_19 | photo | 263 | 577 | 155 | 112 | 15 | assets/photos/background_tile_19.png |
| background_tile_20 | photo | 435 | 577 | 156 | 112 | 15 | assets/photos/background_tile_20.png |
| background_tile_21 | photo | 609 | 577 | 155 | 112 | 15 | assets/photos/background_tile_21.png |
| background_tile_22 | photo | 782 | 577 | 156 | 112 | 15 | assets/photos/background_tile_22.png |
| background_selected_preview | photo | 1152 | 224 | 599 | 331 | 15 | assets/photos/background_selected_preview.png |
| background_back | icon | 129 | 46 | 27 | 40 | 30 | assets/icons/background_back.png |
| background_confirm_arrow | icon | 1687 | 685 | 30 | 42 | 30 | assets/icons/background_confirm_arrow.png |
| background_check | icon | 206 | 171 | 45 | 45 | 30 | assets/icons/background_check.png |
| background_photo_icon | icon | 96 | 749 | 48 | 50 | 30 | assets/icons/background_photo_icon.png |
| header | text | 228 | 50 | 145 | 29 | 40 | 背景を選択 |
| step | text | 1606 | 53 | 101 | 29 | 40 | 03 / 03 |
| preview_header | text | 1403 | 176 | 96 | 24 | 40 | PREVIEW |
| preview_index | text | 1405 | 587 | 92 | 27 | 40 | 01 / 22 |
| confirm | text | 1409 | 686 | 83 | 41 | 40 | 決定 |
| hint | text | 169 | 764 | 563 | 27 | 40 | ホーム画面に表示する背景を選んでください |
| tile_01 | text | 96 | 183 | 21 | 17 | 40 | 01 |
| tile_02 | text | 270 | 183 | 22 | 17 | 40 | 02 |
| tile_03 | text | 442 | 183 | 29 | 23 | 40 | 03 |
| tile_04 | text | 615 | 183 | 29 | 23 | 40 | 04 |
| tile_05 | text | 789 | 183 | 22 | 17 | 40 | 05 |
| tile_06 | text | 958 | 183 | 26 | 23 | 40 | 06 |
| tile_07 | text | 96 | 316 | 21 | 16 | 40 | 07 |
| tile_08 | text | 293 | 315 | 30 | 17 | 40 | 08 |
| tile_09 | text | 501 | 315 | 22 | 17 | 40 | 09 |
| tile_10 | text | 711 | 315 | 30 | 25 | 40 | 10 |
| tile_11 | text | 924 | 315 | 20 | 17 | 40 | 11 |
| tile_12 | text | 97 | 452 | 28 | 25 | 40 | 12 |
| tile_13 | text | 267 | 452 | 33 | 17 | 40 | 13 |
| tile_14 | text | 442 | 452 | 29 | 25 | 40 | 14 |
| tile_15 | text | 615 | 452 | 27 | 24 | 40 | 15 |
| tile_16 | text | 790 | 452 | 28 | 25 | 40 | 16 |
| tile_17 | text | 957 | 452 | 34 | 25 | 40 | 17 |
| tile_18 | text | 97 | 582 | 26 | 24 | 40 | 18 |
| tile_19 | text | 270 | 582 | 30 | 20 | 40 | 19 |
| tile_20 | text | 442 | 582 | 21 | 17 | 40 | 20 |
| tile_21 | text | 615 | 582 | 31 | 24 | 40 | 21 |
| tile_22 | text | 787 | 580 | 28 | 26 | 40 | 22 |

### Tap targets

| ID | X | Y | W | H | Action / route |
|---|---:|---:|---:|---:|---|
| back | 100 | 27 | 91 | 76 | member |
| confirm | 1147 | 651 | 607 | 108 | home |
| background_01 | 88 | 177 | 159 | 111 | select-background |
| background_02 | 263 | 177 | 154 | 111 | select-background |
| background_03 | 434 | 177 | 156 | 112 | select-background |
| background_04 | 607 | 177 | 158 | 112 | select-background |
| background_05 | 781 | 177 | 158 | 112 | select-background |
| background_06 | 955 | 177 | 156 | 112 | select-background |
| background_07 | 88 | 311 | 181 | 113 | select-background |
| background_08 | 286 | 311 | 190 | 113 | select-background |
| background_09 | 495 | 311 | 190 | 114 | select-background |
| background_10 | 704 | 311 | 194 | 114 | select-background |
| background_11 | 917 | 311 | 194 | 115 | select-background |
| background_12 | 88 | 448 | 156 | 107 | select-background |
| background_13 | 263 | 448 | 153 | 108 | select-background |
| background_14 | 434 | 448 | 156 | 108 | select-background |
| background_15 | 607 | 448 | 156 | 108 | select-background |
| background_16 | 781 | 448 | 157 | 108 | select-background |
| background_17 | 954 | 448 | 157 | 108 | select-background |
| background_18 | 88 | 577 | 156 | 112 | select-background |
| background_19 | 263 | 577 | 155 | 112 | select-background |
| background_20 | 435 | 577 | 156 | 112 | select-background |
| background_21 | 609 | 577 | 155 | 112 | select-background |
| background_22 | 782 | 577 | 156 | 112 | select-background |

## Home preserved specification

The approved home coordinates, asset names, z order, and tap regions remain in `home_approved/spec/home_layout.json`, `home_approved/spec/home_layout.csv`, and `home_approved/spec/layout_spec.md`. Resolve their asset paths relative to `home_approved/`. None of those files were modified.

## Resize / safe area

Subtract env(safe-area-inset-top/right/bottom/left) from the available viewport. Scale the reference canvas uniformly with min(safeWidth/1844,safeHeight/853). Center the result within the safe rectangle. Every image, text position, and hit region uses this same transformation. Do not independently scale X and Y. Do not crop button edges to fill the viewport.

## Render order

Photo plate z=0 → panel/frame z=10 → photo tiles/portraits z=15 → static logo z=20 → independent icons z=30 → DOM text z=40. The preserved home uses its existing z=0/10/20/30 order.