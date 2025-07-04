��i m p o r t   {   s e r v e   }   f r o m   " h t t p s : / / d e n o . l a n d / s t d @ 0 . 1 6 8 . 0 / h t t p / s e r v e r . t s " ;  
 i m p o r t   {   c r e a t e C l i e n t   }   f r o m   " h t t p s : / / e s m . s h / @ s u p a b a s e / s u p a b a s e - j s @ 2 " ;  
  
 i n t e r f a c e   U s e r P r e f e r e n c e   {  
     i d :   s t r i n g ;  
     u s e r _ i d :   s t r i n g ;  
     f a v o r i t e _ s p o r t s :   s t r i n g [ ] ;  
     p r e f e r r e d _ v e n u e s :   s t r i n g [ ] ;  
     p r e f e r r e d _ d a y s :   s t r i n g [ ] ;  
     p r e f e r r e d _ t i m e s :   s t r i n g [ ] ;  
     p r e f e r r e d _ g r o u p _ s i z e :   n u m b e r ;  
     p r e f e r r e d _ s k i l l _ l e v e l :   s t r i n g ;  
     p r e f e r r e d _ m a t c h _ f r e q u e n c y :   s t r i n g ;  
 }  
  
 i n t e r f a c e   M a t c h   {  
     i d :   s t r i n g ;  
     c r e a t o r _ i d :   s t r i n g ;  
     t i t l e :   s t r i n g ;  
     d e s c r i p t i o n :   s t r i n g ;  
     s p o r t _ t y p e :   s t r i n g ;  
     v e n u e _ i d :   s t r i n g ;  
     v e n u e _ n a m e :   s t r i n g ;  
     d a t e :   s t r i n g ;  
     t i m e :   s t r i n g ;  
     d u r a t i o n :   n u m b e r ;  
     c u r r e n t _ p l a y e r s :   n u m b e r ;  
     m a x _ p l a y e r s :   n u m b e r ;  
     s k i l l _ l e v e l :   s t r i n g ;  
     s t a t u s :   s t r i n g ;  
     c r e a t e d _ a t :   s t r i n g ;  
     m a t c h _ s c o r e :   n u m b e r ;  
 }  
  
 / /   W e i g h t s   f o r   d i f f e r e n t   p r e f e r e n c e   c o m p o n e n t s  
 c o n s t   W E I G H T S   =   {  
     S P O R T S :   0 . 5 ,                 / /   5 0 %   o f   d i r e c t   m a t c h i n g   s c o r e  
     V E N U E S :   0 . 2 ,                 / /   2 0 %   o f   d i r e c t   m a t c h i n g   s c o r e  
     S C H E D U L E :   0 . 1 5 ,           / /   1 5 %   o f   d i r e c t   m a t c h i n g   s c o r e  
     O T H E R _ P R E F S :   0 . 1 5 ,     / /   1 5 %   o f   d i r e c t   m a t c h i n g   s c o r e  
 } ;  
  
 / /   D i r e c t   p r e f e r e n c e   m a t c h i n g   m a k e s   u p   6 0 %   o f   t h e   t o t a l   r e c o m m e n d a t i o n   s c o r e  
 c o n s t   D I R E C T _ M A T C H I N G _ W E I G H T   =   0 . 6 ;  
  
 s e r v e ( a s y n c   ( r e q )   = >   {  
     t r y   {  
         / /   C r e a t e   a   S u p a b a s e   c l i e n t   w i t h   t h e   A u t h   c o n t e x t   o f   t h e   l o g g e d   i n   u s e r  
         c o n s t   a u t h o r i z a t i o n   =   r e q . h e a d e r s . g e t ( ' A u t h o r i z a t i o n ' ) ;  
         i f   ( ! a u t h o r i z a t i o n )   {  
             r e t u r n   n e w   R e s p o n s e ( J S O N . s t r i n g i f y ( {   e r r o r :   ' M i s s i n g   a u t h o r i z a t i o n   h e a d e r '   } ) ,   {  
                 h e a d e r s :   {   ' C o n t e n t - T y p e ' :   ' a p p l i c a t i o n / j s o n '   } ,  
                 s t a t u s :   4 0 1 ,  
             } ) ;  
         }  
  
         / /   P a r s e   r e q u e s t   p a r a m e t e r s  
         c o n s t   {   l i m i t   =   1 0 ,   o f f s e t   =   0   }   =   a w a i t   r e q . j s o n ( ) ;  
  
         / /   C r e a t e   S u p a b a s e   c l i e n t  
         c o n s t   s u p a b a s e C l i e n t   =   c r e a t e C l i e n t (  
             D e n o . e n v . g e t ( ' S U P A B A S E _ U R L ' )   ? ?   ' ' ,  
             D e n o . e n v . g e t ( ' S U P A B A S E _ A N O N _ K E Y ' )   ? ?   ' ' ,  
             {   g l o b a l :   {   h e a d e r s :   {   A u t h o r i z a t i o n :   a u t h o r i z a t i o n   }   }   }  
         ) ;  
  
         / /   G e t   t h e   u s e r   I D   f r o m   t h e   J W T  
         c o n s t   {  
             d a t a :   {   u s e r   } ,  
         }   =   a w a i t   s u p a b a s e C l i e n t . a u t h . g e t U s e r ( ) ;  
  
         i f   ( ! u s e r )   {  
             r e t u r n   n e w   R e s p o n s e ( J S O N . s t r i n g i f y ( {   e r r o r :   ' U s e r   n o t   f o u n d '   } ) ,   {  
                 h e a d e r s :   {   ' C o n t e n t - T y p e ' :   ' a p p l i c a t i o n / j s o n '   } ,  
                 s t a t u s :   4 0 4 ,  
             } ) ;  
         }  
  
         / /   G e t   u s e r   p r e f e r e n c e s  
         c o n s t   {   d a t a :   u s e r P r e f e r e n c e s ,   e r r o r :   p r e f e r e n c e s E r r o r   }   =   a w a i t   s u p a b a s e C l i e n t  
             . f r o m ( ' u s e r _ p r e f e r e n c e s ' )  
             . s e l e c t ( ' * ' )  
             . e q ( ' u s e r _ i d ' ,   u s e r . i d )  
             . s i n g l e ( ) ;  
  
         i f   ( p r e f e r e n c e s E r r o r )   {  
             c o n s o l e . e r r o r ( ' E r r o r   f e t c h i n g   u s e r   p r e f e r e n c e s : ' ,   p r e f e r e n c e s E r r o r ) ;  
             r e t u r n   n e w   R e s p o n s e ( J S O N . s t r i n g i f y ( {   e r r o r :   ' E r r o r   f e t c h i n g   u s e r   p r e f e r e n c e s '   } ) ,   {  
                 h e a d e r s :   {   ' C o n t e n t - T y p e ' :   ' a p p l i c a t i o n / j s o n '   } ,  
                 s t a t u s :   5 0 0 ,  
             } ) ;  
         }  
  
         i f   ( ! u s e r P r e f e r e n c e s )   {  
             r e t u r n   n e w   R e s p o n s e ( J S O N . s t r i n g i f y ( {   e r r o r :   ' U s e r   p r e f e r e n c e s   n o t   f o u n d '   } ) ,   {  
                 h e a d e r s :   {   ' C o n t e n t - T y p e ' :   ' a p p l i c a t i o n / j s o n '   } ,  
                 s t a t u s :   4 0 4 ,  
             } ) ;  
         }  
  
         / /   G e t   a l l   a c t i v e   m a t c h e s  
         c o n s t   {   d a t a :   m a t c h e s ,   e r r o r :   m a t c h e s E r r o r   }   =   a w a i t   s u p a b a s e C l i e n t  
             . f r o m ( ' m a t c h e s ' )  
             . s e l e c t ( `  
                 * ,  
                 v e n u e s ( n a m e )  
             ` )  
             . e q ( ' s t a t u s ' ,   ' a c t i v e ' )  
             . n e q ( ' c r e a t o r _ i d ' ,   u s e r . i d )   / /   E x c l u d e   m a t c h e s   c r e a t e d   b y   t h e   u s e r  
             . o r d e r ( ' d a t e ' ,   {   a s c e n d i n g :   t r u e   } ) ;  
  
         i f   ( m a t c h e s E r r o r )   {  
             c o n s o l e . e r r o r ( ' E r r o r   f e t c h i n g   m a t c h e s : ' ,   m a t c h e s E r r o r ) ;  
             r e t u r n   n e w   R e s p o n s e ( J S O N . s t r i n g i f y ( {   e r r o r :   ' E r r o r   f e t c h i n g   m a t c h e s '   } ) ,   {  
                 h e a d e r s :   {   ' C o n t e n t - T y p e ' :   ' a p p l i c a t i o n / j s o n '   } ,  
                 s t a t u s :   5 0 0 ,  
             } ) ;  
         }  
  
         / /   C a l c u l a t e   m a t c h   s c o r e s  
         c o n s t   s c o r e d M a t c h e s   =   m a t c h e s . m a p ( ( m a t c h )   = >   {  
             / /   C a l c u l a t e   d i r e c t   p r e f e r e n c e   m a t c h i n g   s c o r e   a n d   c o m p o n e n t   s c o r e s  
             c o n s t   {    
                 d i r e c t M a t c h i n g S c o r e ,  
                 s p o r t M a t c h S c o r e ,  
                 v e n u e M a t c h S c o r e ,  
                 s c h e d u l e M a t c h S c o r e ,  
                 o t h e r P r e f s M a t c h S c o r e  
             }   =   c a l c u l a t e A l l M a t c h S c o r e s ( u s e r P r e f e r e n c e s ,   m a t c h ) ;  
              
             / /   F o r   n o w ,   w e ' r e   o n l y   i m p l e m e n t i n g   d i r e c t   m a t c h i n g   ( 6 0 %   o f   t o t a l   s c o r e )  
             / /   I n   f u t u r e   v e r s i o n s ,   w e ' l l   a d d   c o l l a b o r a t i v e   f i l t e r i n g   ( 3 0 % )   a n d   a c t i v i t y - b a s e d   ( 1 0 % )  
             c o n s t   t o t a l S c o r e   =   d i r e c t M a t c h i n g S c o r e   *   D I R E C T _ M A T C H I N G _ W E I G H T ;  
              
             r e t u r n   {  
                 . . . m a t c h ,  
                 v e n u e _ n a m e :   m a t c h . v e n u e s ? . n a m e   | |   ' U n k n o w n   V e n u e ' ,  
                 m a t c h _ s c o r e :   t o t a l S c o r e ,  
                 / /   I n c l u d e   c o m p o n e n t   s c o r e s   f o r   U I   d i s p l a y  
                 s p o r t _ m a t c h _ s c o r e :   s p o r t M a t c h S c o r e ,  
                 v e n u e _ m a t c h _ s c o r e :   v e n u e M a t c h S c o r e ,  
                 s c h e d u l e _ m a t c h _ s c o r e :   s c h e d u l e M a t c h S c o r e ,  
                 o t h e r _ p r e f s _ m a t c h _ s c o r e :   o t h e r P r e f s M a t c h S c o r e  
             } ;  
         } ) ;  
  
         / /   S o r t   m a t c h e s   b y   s c o r e   ( d e s c e n d i n g )   a n d   a p p l y   p a g i n a t i o n  
         c o n s t   r e c o m m e n d e d M a t c h e s   =   s c o r e d M a t c h e s  
             . s o r t ( ( a ,   b )   = >   b . m a t c h _ s c o r e   -   a . m a t c h _ s c o r e )  
             . s l i c e ( o f f s e t ,   o f f s e t   +   l i m i t ) ;  
  
         r e t u r n   n e w   R e s p o n s e ( J S O N . s t r i n g i f y ( {    
             d a t a :   r e c o m m e n d e d M a t c h e s ,  
             c o u n t :   r e c o m m e n d e d M a t c h e s . l e n g t h ,  
             t o t a l :   s c o r e d M a t c h e s . l e n g t h  
         } ) ,   {  
             h e a d e r s :   {   ' C o n t e n t - T y p e ' :   ' a p p l i c a t i o n / j s o n '   } ,  
             s t a t u s :   2 0 0 ,  
         } ) ;  
     }   c a t c h   ( e r r o r )   {  
         c o n s o l e . e r r o r ( ' U n e x p e c t e d   e r r o r : ' ,   e r r o r ) ;  
         r e t u r n   n e w   R e s p o n s e ( J S O N . s t r i n g i f y ( {   e r r o r :   ' U n e x p e c t e d   e r r o r   o c c u r r e d '   } ) ,   {  
             h e a d e r s :   {   ' C o n t e n t - T y p e ' :   ' a p p l i c a t i o n / j s o n '   } ,  
             s t a t u s :   5 0 0 ,  
         } ) ;  
     }  
 } ) ;  
  
 / * *  
   *   C a l c u l a t e   a l l   m a t c h   s c o r e s   b e t w e e n   u s e r   p r e f e r e n c e s   a n d   a   m a t c h  
   *   R e t u r n s   b o t h   t h e   o v e r a l l   s c o r e   a n d   i n d i v i d u a l   c o m p o n e n t   s c o r e s  
   * /  
 f u n c t i o n   c a l c u l a t e A l l M a t c h S c o r e s ( u s e r P r e f e r e n c e s :   U s e r P r e f e r e n c e ,   m a t c h :   a n y ) :   {  
     d i r e c t M a t c h i n g S c o r e :   n u m b e r ;  
     s p o r t M a t c h S c o r e :   n u m b e r ;  
     v e n u e M a t c h S c o r e :   n u m b e r ;  
     s c h e d u l e M a t c h S c o r e :   n u m b e r ;  
     o t h e r P r e f s M a t c h S c o r e :   n u m b e r ;  
 }   {  
     / /   1 .   S p o r t   t y p e   m a t c h i n g   ( 5 0 %   o f   d i r e c t   m a t c h i n g )  
     c o n s t   s p o r t M a t c h S c o r e   =   c a l c u l a t e S p o r t M a t c h S c o r e ( u s e r P r e f e r e n c e s . f a v o r i t e _ s p o r t s ,   m a t c h . s p o r t _ t y p e ) ;  
      
     / /   2 .   V e n u e   p r e f e r e n c e   m a t c h i n g   ( 2 0 %   o f   d i r e c t   m a t c h i n g )  
     c o n s t   v e n u e M a t c h S c o r e   =   c a l c u l a t e V e n u e M a t c h S c o r e ( u s e r P r e f e r e n c e s . p r e f e r r e d _ v e n u e s ,   m a t c h . v e n u e _ i d ) ;  
      
     / /   3 .   S c h e d u l e   p r e f e r e n c e   m a t c h i n g   ( 1 5 %   o f   d i r e c t   m a t c h i n g )  
     c o n s t   s c h e d u l e M a t c h S c o r e   =   c a l c u l a t e S c h e d u l e M a t c h S c o r e (  
         u s e r P r e f e r e n c e s . p r e f e r r e d _ d a y s ,  
         u s e r P r e f e r e n c e s . p r e f e r r e d _ t i m e s ,  
         m a t c h . d a t e ,  
         m a t c h . t i m e  
     ) ;  
      
     / /   4 .   O t h e r   p r e f e r e n c e s   m a t c h i n g   ( 1 5 %   o f   d i r e c t   m a t c h i n g )  
     c o n s t   o t h e r P r e f s M a t c h S c o r e   =   c a l c u l a t e O t h e r P r e f e r e n c e s M a t c h S c o r e (  
         u s e r P r e f e r e n c e s . p r e f e r r e d _ g r o u p _ s i z e ,  
         u s e r P r e f e r e n c e s . p r e f e r r e d _ s k i l l _ l e v e l ,  
         m a t c h . m a x _ p l a y e r s ,  
         m a t c h . s k i l l _ l e v e l  
     ) ;  
      
     / /   C a l c u l a t e   w e i g h t e d   s c o r e  
     c o n s t   d i r e c t M a t c h i n g S c o r e   =    
         ( s p o r t M a t c h S c o r e   *   W E I G H T S . S P O R T S )   +  
         ( v e n u e M a t c h S c o r e   *   W E I G H T S . V E N U E S )   +  
         ( s c h e d u l e M a t c h S c o r e   *   W E I G H T S . S C H E D U L E )   +  
         ( o t h e r P r e f s M a t c h S c o r e   *   W E I G H T S . O T H E R _ P R E F S ) ;  
      
     r e t u r n   {  
         d i r e c t M a t c h i n g S c o r e ,  
         s p o r t M a t c h S c o r e ,  
         v e n u e M a t c h S c o r e ,  
         s c h e d u l e M a t c h S c o r e ,  
         o t h e r P r e f s M a t c h S c o r e  
     } ;  
 }  
  
 / * *  
   *   C a l c u l a t e   t h e   d i r e c t   m a t c h i n g   s c o r e   b e t w e e n   u s e r   p r e f e r e n c e s   a n d   a   m a t c h  
   *   T h i s   f u n c t i o n   i m p l e m e n t s   t h e   d i r e c t   p r e f e r e n c e   m a t c h i n g   a l g o r i t h m   ( 6 0 %   o f   t o t a l   s c o r e )  
   * /  
 f u n c t i o n   c a l c u l a t e D i r e c t M a t c h i n g S c o r e ( u s e r P r e f e r e n c e s :   U s e r P r e f e r e n c e ,   m a t c h :   a n y ) :   n u m b e r   {  
     c o n s t   {   d i r e c t M a t c h i n g S c o r e   }   =   c a l c u l a t e A l l M a t c h S c o r e s ( u s e r P r e f e r e n c e s ,   m a t c h ) ;  
     r e t u r n   d i r e c t M a t c h i n g S c o r e ;  
 }  
  
 / * *  
   *   C a l c u l a t e   s p o r t   m a t c h   s c o r e   b a s e d   o n   u s e r ' s   f a v o r i t e   s p o r t s  
   * /  
 f u n c t i o n   c a l c u l a t e S p o r t M a t c h S c o r e ( f a v o r i t e S p o r t s :   s t r i n g [ ] ,   m a t c h S p o r t :   s t r i n g ) :   n u m b e r   {  
     i f   ( ! f a v o r i t e S p o r t s   | |   f a v o r i t e S p o r t s . l e n g t h   = = =   0 )   {  
         r e t u r n   0 . 5 ;   / /   N e u t r a l   s c o r e   i f   n o   p r e f e r e n c e s  
     }  
      
     / /   E x a c t   m a t c h   g e t s   f u l l   s c o r e  
     i f   ( f a v o r i t e S p o r t s . i n c l u d e s ( m a t c h S p o r t ) )   {  
         r e t u r n   1 . 0 ;  
     }  
      
     / /   N o   m a t c h   g e t s   l o w   s c o r e  
     r e t u r n   0 . 1 ;  
 }  
  
 / * *  
   *   C a l c u l a t e   v e n u e   m a t c h   s c o r e   b a s e d   o n   u s e r ' s   p r e f e r r e d   v e n u e s  
   * /  
 f u n c t i o n   c a l c u l a t e V e n u e M a t c h S c o r e ( p r e f e r r e d V e n u e s :   s t r i n g [ ] ,   m a t c h V e n u e I d :   s t r i n g ) :   n u m b e r   {  
     i f   ( ! p r e f e r r e d V e n u e s   | |   p r e f e r r e d V e n u e s . l e n g t h   = = =   0 )   {  
         r e t u r n   0 . 5 ;   / /   N e u t r a l   s c o r e   i f   n o   p r e f e r e n c e s  
     }  
      
     / /   E x a c t   m a t c h   g e t s   f u l l   s c o r e  
     i f   ( p r e f e r r e d V e n u e s . i n c l u d e s ( m a t c h V e n u e I d ) )   {  
         r e t u r n   1 . 0 ;  
     }  
      
     / /   N o   m a t c h   g e t s   m e d i u m   s c o r e  
     r e t u r n   0 . 3 ;  
 }  
  
 / * *  
   *   C a l c u l a t e   s c h e d u l e   m a t c h   s c o r e   b a s e d   o n   u s e r ' s   p r e f e r r e d   d a y s   a n d   t i m e s  
   * /  
 f u n c t i o n   c a l c u l a t e S c h e d u l e M a t c h S c o r e (  
     p r e f e r r e d D a y s :   s t r i n g [ ] ,  
     p r e f e r r e d T i m e s :   s t r i n g [ ] ,  
     m a t c h D a t e :   s t r i n g ,  
     m a t c h T i m e :   s t r i n g  
 ) :   n u m b e r   {  
     i f   ( ( ! p r e f e r r e d D a y s   | |   p r e f e r r e d D a y s . l e n g t h   = = =   0 )   & &    
             ( ! p r e f e r r e d T i m e s   | |   p r e f e r r e d T i m e s . l e n g t h   = = =   0 ) )   {  
         r e t u r n   0 . 5 ;   / /   N e u t r a l   s c o r e   i f   n o   p r e f e r e n c e s  
     }  
      
     l e t   d a y S c o r e   =   0 . 5 ;  
     l e t   t i m e S c o r e   =   0 . 5 ;  
      
     / /   C a l c u l a t e   d a y   m a t c h   s c o r e  
     i f   ( p r e f e r r e d D a y s   & &   p r e f e r r e d D a y s . l e n g t h   >   0 )   {  
         c o n s t   m a t c h D a y   =   n e w   D a t e ( m a t c h D a t e ) . t o L o c a l e D a t e S t r i n g ( ' e n - U S ' ,   {   w e e k d a y :   ' l o n g '   } ) . t o L o w e r C a s e ( ) ;  
         i f   ( p r e f e r r e d D a y s . m a p ( d a y   = >   d a y . t o L o w e r C a s e ( ) ) . i n c l u d e s ( m a t c h D a y ) )   {  
             d a y S c o r e   =   1 . 0 ;  
         }   e l s e   {  
             d a y S c o r e   =   0 . 2 ;  
         }  
     }  
      
     / /   C a l c u l a t e   t i m e   m a t c h   s c o r e  
     i f   ( p r e f e r r e d T i m e s   & &   p r e f e r r e d T i m e s . l e n g t h   >   0 )   {  
         / /   S i m p l e   t i m e   p e r i o d   m a t c h i n g   ( m o r n i n g ,   a f t e r n o o n ,   e v e n i n g )  
         c o n s t   m a t c h H o u r   =   p a r s e I n t ( m a t c h T i m e . s p l i t ( ' : ' ) [ 0 ] ,   1 0 ) ;  
         l e t   m a t c h T i m e P e r i o d   =   ' ' ;  
          
         i f   ( m a t c h H o u r   <   1 2 )   {  
             m a t c h T i m e P e r i o d   =   ' m o r n i n g ' ;  
         }   e l s e   i f   ( m a t c h H o u r   <   1 7 )   {  
             m a t c h T i m e P e r i o d   =   ' a f t e r n o o n ' ;  
         }   e l s e   {  
             m a t c h T i m e P e r i o d   =   ' e v e n i n g ' ;  
         }  
          
         i f   ( p r e f e r r e d T i m e s . m a p ( t i m e   = >   t i m e . t o L o w e r C a s e ( ) ) . i n c l u d e s ( m a t c h T i m e P e r i o d ) )   {  
             t i m e S c o r e   =   1 . 0 ;  
         }   e l s e   {  
             t i m e S c o r e   =   0 . 2 ;  
         }  
     }  
      
     / /   A v e r a g e   o f   d a y   a n d   t i m e   s c o r e s  
     r e t u r n   ( d a y S c o r e   +   t i m e S c o r e )   /   2 ;  
 }  
  
 / * *  
   *   C a l c u l a t e   o t h e r   p r e f e r e n c e s   m a t c h   s c o r e   ( g r o u p   s i z e ,   s k i l l   l e v e l )  
   * /  
 f u n c t i o n   c a l c u l a t e O t h e r P r e f e r e n c e s M a t c h S c o r e (  
     p r e f e r r e d G r o u p S i z e :   n u m b e r ,  
     p r e f e r r e d S k i l l L e v e l :   s t r i n g ,  
     m a t c h M a x P l a y e r s :   n u m b e r ,  
     m a t c h S k i l l L e v e l :   s t r i n g  
 ) :   n u m b e r   {  
     / /   G r o u p   s i z e   m a t c h   s c o r e  
     c o n s t   g r o u p S i z e D i f f   =   M a t h . a b s ( p r e f e r r e d G r o u p S i z e   -   m a t c h M a x P l a y e r s ) ;  
     c o n s t   m a x G r o u p S i z e D i f f   =   1 0 ;   / /   A s s u m i n g   m a x   d i f f e r e n c e   i s   1 0  
     c o n s t   n o r m a l i z e d G r o u p S i z e D i f f   =   1   -   M a t h . m i n ( g r o u p S i z e D i f f   /   m a x G r o u p S i z e D i f f ,   1 ) ;  
      
     / /   S k i l l   l e v e l   m a t c h   s c o r e  
     l e t   s k i l l L e v e l S c o r e   =   0 . 5 ;  
     i f   ( p r e f e r r e d S k i l l L e v e l   & &   m a t c h S k i l l L e v e l )   {  
         i f   ( p r e f e r r e d S k i l l L e v e l . t o L o w e r C a s e ( )   = = =   m a t c h S k i l l L e v e l . t o L o w e r C a s e ( ) )   {  
             s k i l l L e v e l S c o r e   =   1 . 0 ;  
         }   e l s e   {  
             / /   P a r t i a l   m a t c h i n g   f o r   a d j a c e n t   s k i l l   l e v e l s  
             c o n s t   s k i l l L e v e l s   =   [ ' b e g i n n e r ' ,   ' i n t e r m e d i a t e ' ,   ' a d v a n c e d ' ,   ' p r o f e s s i o n a l ' ] ;  
             c o n s t   p r e f e r r e d I n d e x   =   s k i l l L e v e l s . i n d e x O f ( p r e f e r r e d S k i l l L e v e l . t o L o w e r C a s e ( ) ) ;  
             c o n s t   m a t c h I n d e x   =   s k i l l L e v e l s . i n d e x O f ( m a t c h S k i l l L e v e l . t o L o w e r C a s e ( ) ) ;  
              
             i f   ( p r e f e r r e d I n d e x   ! = =   - 1   & &   m a t c h I n d e x   ! = =   - 1 )   {  
                 c o n s t   l e v e l D i f f   =   M a t h . a b s ( p r e f e r r e d I n d e x   -   m a t c h I n d e x ) ;  
                 i f   ( l e v e l D i f f   = = =   1 )   {  
                     s k i l l L e v e l S c o r e   =   0 . 5 ;   / /   A d j a c e n t   l e v e l  
                 }   e l s e   {  
                     s k i l l L e v e l S c o r e   =   0 . 2 ;   / /   M o r e   d i s t a n t   l e v e l  
                 }  
             }  
         }  
     }  
      
     / /   A v e r a g e   o f   g r o u p   s i z e   a n d   s k i l l   l e v e l   s c o r e s  
     r e t u r n   ( n o r m a l i z e d G r o u p S i z e D i f f   +   s k i l l L e v e l S c o r e )   /   2 ;  
 }  
 